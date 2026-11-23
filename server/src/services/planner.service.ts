import { Types } from 'mongoose';
import { StudyPlan, IStudyPlan } from '../models/StudyPlan.js';
import { StudyProfile, IStudyProfile } from '../models/StudyProfile.js';
import { StudyDayProgress, IStudyDayProgress } from '../models/StudyDayProgress.js';
import { DSASession, IDSASession } from '../models/DSASession.js';
import { StudyNote, IStudyNote } from '../models/StudyNote.js';
import { ActivityTimerSession, IActivityTimerSession } from '../models/ActivityTimerSession.js';
import { StudyScheduleItem, IStudyScheduleItem } from '../models/StudyScheduleItem.js';
import { Concept } from '../models/Concept.js';
import { Subject } from '../models/Subject.js';
import { DSA_PATTERNS } from '../data/dsaQuestions.js';
import { REACT_EPISODES } from '../data/reactEpisodes.js';
import {
  calculateDailyTimetable,
  calculateDailyScore,
  formatDuration,
  formatDurationDifference,
  formatSecondsToStopwatch,
  TaskTimeSlot,
} from '../utils/plannerCalculations.js';
import { slugify } from '../utils/slugify.js';
import { AppError } from '../utils/errorHandler.js';

export class PlannerService {
  /**
   * Ensure default profiles ("you", "girlfriend") and initial 10-day plan exist.
   */
  static async ensureDefaultData(): Promise<IStudyPlan> {
    // 1. Ensure default profiles exist
    await StudyProfile.findOneAndUpdate(
      { profileId: 'you' },
      { profileId: 'you', displayName: 'You', color: 'blue' },
      { upsert: true, new: true }
    );
    await StudyProfile.findOneAndUpdate(
      { profileId: 'girlfriend' },
      { profileId: 'girlfriend', displayName: 'Girlfriend', color: 'pink' },
      { upsert: true, new: true }
    );

    // 2. Ensure initial plan exists
    let defaultPlan = await StudyPlan.findOne({ status: 'active' });
    if (!defaultPlan) {
      defaultPlan = await StudyPlan.create({
        name: '10-Day React + DSA Preparation',
        description: 'Comprehensive 10-day preparation plan covering React, curated DSA patterns, System Design, and Project Learning.',
        startDate: '2026-11-24',
        endDate: '2026-12-03',
        status: 'active',
        defaultStartTime: '10:30',
        totalDays: 10,
      });
    }

    return defaultPlan;
  }

  /**
   * Retrieve all plans.
   */
  static async getAllPlans(): Promise<IStudyPlan[]> {
    await this.ensureDefaultData();
    return StudyPlan.find().sort({ createdAt: -1 });
  }

  /**
   * Get plan by ID or return active plan.
   */
  static async getPlanById(planId?: string): Promise<IStudyPlan> {
    if (!planId || planId === 'default' || planId === 'active') {
      return this.ensureDefaultData();
    }
    const plan = await StudyPlan.findById(planId);
    if (!plan) throw new AppError('Study plan not found', 404);
    return plan;
  }

  /**
   * Create a new plan.
   */
  static async createPlan(data: Partial<IStudyPlan>): Promise<IStudyPlan> {
    const plan = await StudyPlan.create(data);
    return plan;
  }

  /**
   * Update plan.
   */
  static async updatePlan(planId: string, data: Partial<IStudyPlan>): Promise<IStudyPlan> {
    const plan = await StudyPlan.findByIdAndUpdate(planId, data, { new: true });
    if (!plan) throw new AppError('Study plan not found', 404);
    return plan;
  }

  /**
   * Duplicate plan.
   */
  static async duplicatePlan(planId: string): Promise<IStudyPlan> {
    const original = await StudyPlan.findById(planId);
    if (!original) throw new AppError('Study plan not found to duplicate', 404);

    const duplicated = await StudyPlan.create({
      name: `Copy of ${original.name}`,
      description: original.description,
      startDate: original.startDate,
      endDate: original.endDate,
      status: 'active',
      defaultStartTime: original.defaultStartTime,
      totalDays: original.totalDays,
    });
    return duplicated;
  }

  /**
   * Archive plan.
   */
  static async archivePlan(planId: string): Promise<IStudyPlan> {
    const plan = await StudyPlan.findByIdAndUpdate(planId, { status: 'archived' }, { new: true });
    if (!plan) throw new AppError('Study plan not found', 404);
    return plan;
  }

  /**
   * Calculate day index (1..N) within a plan for a given date string.
   */
  static getPlanDayNumber(startDateStr: string, targetDateStr: string): number {
    const start = new Date(startDateStr);
    const target = new Date(targetDateStr);
    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // 1-indexed
  }

  /**
   * Helper to recalculate and persist a profile's daily score on a given date.
   */
  static async recalculateScoreForDay(
    planId: Types.ObjectId,
    date: string,
    profileId: 'you' | 'girlfriend'
  ): Promise<IStudyDayProgress> {
    let progress = await StudyDayProgress.findOne({ planId, date, profileId });
    if (!progress) {
      progress = new StudyDayProgress({
        planId,
        date,
        profileId,
      });
    }

    const dsaSession = await DSASession.findOne({ planId, date, profileId });
    const completedDSACount = dsaSession ? dsaSession.completedProblemNumbers.length : 0;

    // Check if a non-empty note exists for this date and profile
    const noteCount = await StudyNote.countDocuments({
      planId,
      date,
      profileId,
      $or: [
        { content: { $exists: true, $ne: '' } },
        { approach: { $exists: true, $ne: '' } },
        { keyObservation: { $exists: true, $ne: '' } },
        { title: { $exists: true, $ne: '' } },
      ],
    });

    const { totalScore, breakdown } = calculateDailyScore({
      reactCompleted: !!progress.reactCompleted,
      dsaCompletedQuestionsCount: completedDSACount,
      afternoonCompleted: !!progress.afternoonCompleted,
      jobSearchCompleted: !!progress.jobSearchCompleted,
      hasNonEmptyNote: noteCount > 0,
    });

    progress.score = totalScore;
    progress.scoreBreakdown = breakdown;
    progress.dsaCompleted = Boolean(progress.dsaCompleted || completedDSACount >= 2); // marked complete if finished timer or target (2-3) reached

    await progress.save();
    return progress;
  }

  /**
   * Monthly calendar data aggregator.
   */
  static async getCalendarData(planId: string, year: number, month: number) {
    const plan = await this.getPlanById(planId);

    // Month is 1-indexed (1..12). Calculate date strings for the entire month
    const paddedMonth = month < 10 ? `0${month}` : `${month}`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOfMonth = `${year}-${paddedMonth}-01`;
    const endOfMonth = `${year}-${paddedMonth}-${daysInMonth < 10 ? `0${daysInMonth}` : daysInMonth}`;

    // Query all progress and DSA sessions for this month
    const progressDocs = await StudyDayProgress.find({
      planId: plan._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();

    const dsaSessions = await DSASession.find({
      planId: plan._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();

    const calendarDays = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const dateStr = `${year}-${paddedMonth}-${dayStr}`;

      const dayNumber = this.getPlanDayNumber(plan.startDate, dateStr);
      const isInActivePlan = dayNumber >= 1 && dayNumber <= plan.totalDays;

      const youProgress = progressDocs.find(p => p.date === dateStr && p.profileId === 'you');
      const gfProgress = progressDocs.find(p => p.date === dateStr && p.profileId === 'girlfriend');

      const youDSA = dsaSessions.find(s => s.date === dateStr && s.profileId === 'you');
      const gfDSA = dsaSessions.find(s => s.date === dateStr && s.profileId === 'girlfriend');

      calendarDays.push({
        date: dateStr,
        day: d,
        dayNumber: isInActivePlan ? dayNumber : null,
        isInActivePlan,
        you: {
          score: youProgress ? youProgress.score : 0,
          reactCompleted: youProgress ? youProgress.reactCompleted : false,
          dsaQuestionsSolved: youDSA ? youDSA.completedProblemNumbers.length : 0,
          afternoonCompleted: youProgress ? youProgress.afternoonCompleted : false,
          jobSearchCompleted: youProgress ? youProgress.jobSearchCompleted : false,
          isCompleted: youProgress ? youProgress.score >= 8 : false,
        },
        girlfriend: {
          score: gfProgress ? gfProgress.score : 0,
          reactCompleted: gfProgress ? gfProgress.reactCompleted : false,
          dsaQuestionsSolved: gfDSA ? gfDSA.completedProblemNumbers.length : 0,
          afternoonCompleted: gfProgress ? gfProgress.afternoonCompleted : false,
          jobSearchCompleted: gfProgress ? gfProgress.jobSearchCompleted : false,
          isCompleted: gfProgress ? gfProgress.score >= 8 : false,
        },
      });
    }

    return {
      plan: {
        id: plan._id,
        name: plan.name,
        startDate: plan.startDate,
        endDate: plan.endDate,
        totalDays: plan.totalDays,
      },
      year,
      month,
      days: calendarDays,
    };
  }

  /**
   * Daily Study View data aggregator.
   */
  static async getDailyStudyView(planId: string, date: string) {
    const plan = await this.getPlanById(planId);

    const dayNumber = this.getPlanDayNumber(plan.startDate, date);
    const clampedDayNumber = Math.max(1, Math.min(plan.totalDays, dayNumber > 0 ? dayNumber : 1));

    // Get progress for both profiles
    let youProgress = await StudyDayProgress.findOne({ planId: plan._id, date, profileId: 'you' });
    if (!youProgress) {
      youProgress = await StudyDayProgress.create({
        planId: plan._id,
        date,
        profileId: 'you',
        startTime: plan.defaultStartTime,
      });
    }

    let gfProgress = await StudyDayProgress.findOne({ planId: plan._id, date, profileId: 'girlfriend' });
    if (!gfProgress) {
      gfProgress = await StudyDayProgress.create({
        planId: plan._id,
        date,
        profileId: 'girlfriend',
        startTime: plan.defaultStartTime,
      });
    }

    // Get DSA sessions for both profiles
    let youDSA = await DSASession.findOne({ planId: plan._id, date, profileId: 'you' });
    if (!youDSA) {
      youDSA = await DSASession.create({
        planId: plan._id,
        date,
        profileId: 'you',
        topicId: 'two-pointers',
        completedProblemNumbers: [],
      });
    }

    let gfDSA = await DSASession.findOne({ planId: plan._id, date, profileId: 'girlfriend' });
    if (!gfDSA) {
      gfDSA = await DSASession.create({
        planId: plan._id,
        date,
        profileId: 'girlfriend',
        topicId: 'binary-search',
        completedProblemNumbers: [],
      });
    }

    // Retrieve Notes for this date
    const notes = await StudyNote.find({ planId: plan._id, date }).sort({ createdAt: -1 }).lean();

    // Check for custom schedule items for this plan and day
    const customItems = await StudyScheduleItem.find({ planId: plan._id, dayNumber: clampedDayNumber }).sort({ order: 1 }).lean();
    const effectiveStartTime = youProgress.startTime || plan.defaultStartTime || '10:30';
    const rawSlots = calculateDailyTimetable(
      clampedDayNumber,
      effectiveStartTime,
      customItems && customItems.length > 0 ? customItems : undefined
    );

    // Query timer sessions for this date
    const timerSessions = await ActivityTimerSession.find({ planId: plan._id, date }).lean();

    const now = new Date();
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();

    const enrichedTimetable = rawSlots.map(slot => {
      // You Timer
      const youTimerDoc = timerSessions.find(t => t.profileId === 'you' && t.activityId === slot.id);
      let youElapsed = 0;
      let youStatus: 'idle' | 'running' | 'paused' | 'completed' = 'idle';
      let youStartedAt: string | undefined;
      let youFinishedAt: string | undefined;

      if (youTimerDoc) {
        youStatus = youTimerDoc.status as any;
        youStartedAt = youTimerDoc.startedAt ? new Date(youTimerDoc.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
        youFinishedAt = youTimerDoc.finishedAt ? new Date(youTimerDoc.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
        if (youTimerDoc.status === 'running' && youTimerDoc.startedAt) {
          youElapsed = Math.max(0, Math.floor((Date.now() - new Date(youTimerDoc.startedAt).getTime() - (youTimerDoc.totalPausedMs || 0)) / 1000));
        } else if (youTimerDoc.status === 'paused' && youTimerDoc.startedAt && youTimerDoc.pausedAt) {
          youElapsed = Math.max(0, Math.floor((new Date(youTimerDoc.pausedAt).getTime() - new Date(youTimerDoc.startedAt).getTime() - (youTimerDoc.totalPausedMs || 0)) / 1000));
        } else if (youTimerDoc.status === 'completed') {
          youElapsed = youTimerDoc.actualDurationSeconds || 0;
        }
      }
      const youDiff = formatDurationDifference(youElapsed, slot.durationMinutes);

      // Girlfriend Timer
      const gfTimerDoc = timerSessions.find(t => t.profileId === 'girlfriend' && t.activityId === slot.id);
      let gfElapsed = 0;
      let gfStatus: 'idle' | 'running' | 'paused' | 'completed' = 'idle';
      let gfStartedAt: string | undefined;
      let gfFinishedAt: string | undefined;

      if (gfTimerDoc) {
        gfStatus = gfTimerDoc.status as any;
        gfStartedAt = gfTimerDoc.startedAt ? new Date(gfTimerDoc.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
        gfFinishedAt = gfTimerDoc.finishedAt ? new Date(gfTimerDoc.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
        if (gfTimerDoc.status === 'running' && gfTimerDoc.startedAt) {
          gfElapsed = Math.max(0, Math.floor((Date.now() - new Date(gfTimerDoc.startedAt).getTime() - (gfTimerDoc.totalPausedMs || 0)) / 1000));
        } else if (gfTimerDoc.status === 'paused' && gfTimerDoc.startedAt && gfTimerDoc.pausedAt) {
          gfElapsed = Math.max(0, Math.floor((new Date(gfTimerDoc.pausedAt).getTime() - new Date(gfTimerDoc.startedAt).getTime() - (gfTimerDoc.totalPausedMs || 0)) / 1000));
        } else if (gfTimerDoc.status === 'completed') {
          gfElapsed = gfTimerDoc.actualDurationSeconds || 0;
        }
      }
      const gfDiff = formatDurationDifference(gfElapsed, slot.durationMinutes);

      const isCurrent = !slot.isFlexible && currentTotalMin >= slot.startTimeMinutes && currentTotalMin < slot.endTimeMinutes;
      const isPast = !slot.isFlexible && currentTotalMin >= slot.endTimeMinutes;

      return {
        ...slot,
        isCurrent,
        isPast,
        youTimer: {
          timerId: youTimerDoc ? youTimerDoc._id.toString() : undefined,
          status: youStatus,
          elapsedSeconds: youElapsed,
          elapsedFormatted: formatSecondsToStopwatch(youElapsed),
          actualDurationFormatted: youTimerDoc?.actualDurationFormatted || (youElapsed > 0 ? formatDuration(Math.round(youElapsed / 60)) : '—'),
          actualStartFormatted: youStartedAt,
          actualFinishFormatted: youFinishedAt,
          diffFormatted: youDiff.formatted,
          isOvertime: youDiff.isOvertime,
          diffStatus: youDiff.status,
        },
        girlfriendTimer: {
          timerId: gfTimerDoc ? gfTimerDoc._id.toString() : undefined,
          status: gfStatus,
          elapsedSeconds: gfElapsed,
          elapsedFormatted: formatSecondsToStopwatch(gfElapsed),
          actualDurationFormatted: gfTimerDoc?.actualDurationFormatted || (gfElapsed > 0 ? formatDuration(Math.round(gfElapsed / 60)) : '—'),
          actualStartFormatted: gfStartedAt,
          actualFinishFormatted: gfFinishedAt,
          diffFormatted: gfDiff.formatted,
          isOvertime: gfDiff.isOvertime,
          diffStatus: gfDiff.status,
        },
      };
    });

    const totalPlannedMinutes = enrichedTimetable
      .filter(s => !s.isBreakOrTransition && !s.isFlexible)
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    const currentActivity = enrichedTimetable.find(s => s.isCurrent) || null;

    // Recalculate fresh scores
    const refreshedYou = await this.recalculateScoreForDay(plan._id as any, date, 'you');
    const refreshedGf = await this.recalculateScoreForDay(plan._id as any, date, 'girlfriend');

    // Calculate overall plan progress for both profiles
    const allPlanProgress = await StudyDayProgress.find({ planId: plan._id }).lean();
    const youTotalScore = allPlanProgress
      .filter(p => p.profileId === 'you')
      .reduce((sum, p) => sum + (p.score || 0), 0);
    const gfTotalScore = allPlanProgress
      .filter(p => p.profileId === 'girlfriend')
      .reduce((sum, p) => sum + (p.score || 0), 0);
    const maxPossiblePlanScore = plan.totalDays * 10;

    return {
      plan: {
        id: plan._id,
        name: plan.name,
        startDate: plan.startDate,
        endDate: plan.endDate,
        totalDays: plan.totalDays,
        currentDayNumber: clampedDayNumber,
        isInPlanRange: dayNumber >= 1 && dayNumber <= plan.totalDays,
      },
      date,
      overallProgress: {
        you: {
          totalScore: youTotalScore,
          maxScore: maxPossiblePlanScore,
          percentage: maxPossiblePlanScore > 0 ? Math.round((youTotalScore / maxPossiblePlanScore) * 100) : 0,
        },
        girlfriend: {
          totalScore: gfTotalScore,
          maxScore: maxPossiblePlanScore,
          percentage: maxPossiblePlanScore > 0 ? Math.round((gfTotalScore / maxPossiblePlanScore) * 100) : 0,
        },
      },
      timetable: enrichedTimetable,
      totalPlannedMinutes,
      totalPlannedFormatted: formatDuration(totalPlannedMinutes),
      currentActivity: currentActivity
        ? {
            id: currentActivity.id,
            name: currentActivity.name,
            startTimeFormatted: currentActivity.startTimeFormatted,
            endTimeFormatted: currentActivity.endTimeFormatted,
            durationFormatted: currentActivity.durationFormatted,
          }
        : null,
      startTime: effectiveStartTime,
      profiles: {
        you: {
          profileId: 'you',
          displayName: 'You',
          color: 'blue',
          score: refreshedYou.score,
          scoreBreakdown: refreshedYou.scoreBreakdown,
          progress: {
            reactCompleted: refreshedYou.reactCompleted,
            dsaCompleted: refreshedYou.dsaCompleted,
            afternoonCompleted: refreshedYou.afternoonCompleted,
            jobSearchCompleted: refreshedYou.jobSearchCompleted,
            jobSearchDetails: refreshedYou.jobSearchDetails,
          },
          dsa: {
            topicId: youDSA.topicId,
            completedProblemNumbers: youDSA.completedProblemNumbers,
            completedCount: youDSA.completedProblemNumbers.length,
          },
        },
        girlfriend: {
          profileId: 'girlfriend',
          displayName: 'Girlfriend',
          color: 'pink',
          score: refreshedGf.score,
          scoreBreakdown: refreshedGf.scoreBreakdown,
          progress: {
            reactCompleted: refreshedGf.reactCompleted,
            dsaCompleted: refreshedGf.dsaCompleted,
            afternoonCompleted: refreshedGf.afternoonCompleted,
            jobSearchCompleted: refreshedGf.jobSearchCompleted,
            jobSearchDetails: refreshedGf.jobSearchDetails,
          },
          dsa: {
            topicId: gfDSA.topicId,
            completedProblemNumbers: gfDSA.completedProblemNumbers,
            completedCount: gfDSA.completedProblemNumbers.length,
          },
        },
      },
      notes,
    };
  }

  /**
   * Update task progress (react, afternoon, job-search, start-time).
   */
  static async updateTaskProgress(params: {
    planId: string;
    date: string;
    profileId: 'you' | 'girlfriend';
    taskKey?: 'reactCompleted' | 'dsaCompleted' | 'afternoonCompleted' | 'jobSearchCompleted';
    completed?: boolean;
    jobSearchDetails?: { role: string; company: string; activity: string; note: string };
    startTime?: '10:30' | '11:00';
  }) {
    const plan = await this.getPlanById(params.planId);
    let progress = await StudyDayProgress.findOne({
      planId: plan._id,
      date: params.date,
      profileId: params.profileId,
    });

    if (!progress) {
      progress = new StudyDayProgress({
        planId: plan._id,
        date: params.date,
        profileId: params.profileId,
      });
    }

    if (params.taskKey && params.completed !== undefined) {
      (progress as any)[params.taskKey] = params.completed;
    }

    if (params.jobSearchDetails) {
      progress.jobSearchDetails = {
        role: params.jobSearchDetails.role || '',
        company: params.jobSearchDetails.company || '',
        activity: params.jobSearchDetails.activity || '',
        note: params.jobSearchDetails.note || '',
      };
      if (params.jobSearchDetails.role || params.jobSearchDetails.activity) {
        progress.jobSearchCompleted = true;
      }
    }

    if (params.startTime) {
      progress.startTime = params.startTime;
    }

    await progress.save();

    // Recalculate score
    const updated = await this.recalculateScoreForDay(plan._id as any, params.date, params.profileId);
    return updated;
  }

  /**
   * Update DSA session: topic selection and/or completed question IDs.
   */
  static async updateDSASession(params: {
    planId: string;
    date: string;
    profileId: 'you' | 'girlfriend';
    topicId: string;
    completedProblemNumbers?: number[];
    notes?: string;
  }) {
    const plan = await this.getPlanById(params.planId);
    let session = await DSASession.findOne({
      planId: plan._id,
      date: params.date,
      profileId: params.profileId,
    });

    if (!session) {
      session = new DSASession({
        planId: plan._id,
        date: params.date,
        profileId: params.profileId,
        topicId: params.topicId,
        completedProblemNumbers: params.completedProblemNumbers || [],
      });
    } else {
      if (params.topicId) session.topicId = params.topicId;
      if (params.completedProblemNumbers !== undefined) {
        session.completedProblemNumbers = params.completedProblemNumbers;
      }
      if (params.notes !== undefined) session.notes = params.notes;
    }

    await session.save();

    // Recalculate score & sync dsaCompleted
    const progress = await this.recalculateScoreForDay(plan._id as any, params.date, params.profileId);
    return { session, progress };
  }

  /**
   * Notes Management.
   */
  static async getNotes(filter: {
    planId?: string;
    date?: string;
    profileId?: string;
    activityType?: string;
  }) {
    const query: any = {};
    if (filter.planId) query.planId = filter.planId;
    if (filter.date) query.date = filter.date;
    if (filter.profileId) query.profileId = filter.profileId;
    if (filter.activityType) query.activityType = filter.activityType;

    return StudyNote.find(query).sort({ updatedAt: -1 }).lean();
  }

  static async createNote(data: any): Promise<IStudyNote> {
    const note = await StudyNote.create(data);
    // Recalculate score for that day
    await this.recalculateScoreForDay(note.planId, note.date, note.profileId as any);
    return note;
  }

  static async updateNote(noteId: string, data: any): Promise<IStudyNote> {
    const note = await StudyNote.findByIdAndUpdate(noteId, data, { new: true });
    if (!note) throw new AppError('Note not found', 404);
    await this.recalculateScoreForDay(note.planId, note.date, note.profileId as any);
    return note;
  }

  static async deleteNote(noteId: string): Promise<void> {
    const note = await StudyNote.findByIdAndDelete(noteId);
    if (!note) throw new AppError('Note not found', 404);
    await this.recalculateScoreForDay(note.planId, note.date, note.profileId as any);
  }

  /**
   * Concept Library Integration: Convert study note into a Concept Library entry.
   */
  static async convertNoteToConcept(params: {
    noteId: string;
    subjectName: string;
    importance: 'low' | 'medium' | 'high';
    difficulty: 'easy' | 'medium' | 'hard';
  }) {
    const note = await StudyNote.findById(params.noteId);
    if (!note) throw new AppError('Note not found', 404);

    let subject = await Subject.findOne({ name: params.subjectName.trim() });
    if (!subject) {
      subject = await Subject.create({
        name: params.subjectName.trim(),
        description: `Knowledge repository for ${params.subjectName.trim()}`,
      });
    }

    const cleanSlug = slugify(note.title);
    let concept = await Concept.findOne({ subjectId: subject._id, slug: cleanSlug });

    let fullExplanation = note.content || '';
    if (note.approach) fullExplanation += `\n\nApproach:\n${note.approach}`;
    if (note.keyObservation) fullExplanation += `\n\nKey Observation:\n${note.keyObservation}`;

    const commonMistakes: string[] = [];
    if (note.commonMistakes) commonMistakes.push(note.commonMistakes);

    if (concept) {
      concept.explanation = `${concept.explanation}\n\nNote from ${note.date}:\n${fullExplanation}`;
      if (commonMistakes.length > 0) {
        concept.commonMistakes.push(...commonMistakes);
      }
      await concept.save();
    } else {
      concept = await Concept.create({
        subjectId: subject._id,
        title: note.title,
        slug: cleanSlug,
        explanation: fullExplanation || `${note.title} note`,
        importance: params.importance || 'high',
        difficulty: params.difficulty || 'medium',
        practicalExample: note.timeComplexity ? `Time: ${note.timeComplexity}, Space: ${note.spaceComplexity}` : '',
        commonMistakes,
      });
    }

    note.relatedConceptId = concept._id as any;
    await note.save();

    return {
      success: true,
      conceptId: concept._id.toString(),
      conceptTitle: concept.title,
      subjectName: subject.name,
    };
  }

  /**
   * Return 16 curated DSA patterns.
   */
  static getDSATopics() {
    return DSA_PATTERNS;
  }

  // ----------------------------------------------------
  // Live Timer / Stopwatch Engine
  // ----------------------------------------------------

  /**
   * Start stopwatch timer for a profile and activity.
   * Auto-pauses any other running timer for the same profile to prevent concurrent running timers.
   */
  static async startTimer(params: {
    planId: string;
    date: string;
    profileId: 'you' | 'girlfriend';
    activityId: string;
    activityName: string;
  }) {
    // 1. Prevent concurrent running timers for the same profile: pause any other running timer
    const runningTimers = await ActivityTimerSession.find({
      planId: params.planId,
      date: params.date,
      profileId: params.profileId,
      activityId: { $ne: params.activityId },
      status: 'running',
    });
    for (const rt of runningTimers) {
      rt.status = 'paused';
      rt.pausedAt = new Date();
      await rt.save();
    }

    // 2. Find or create session for this activity
    let session = await ActivityTimerSession.findOne({
      planId: params.planId,
      date: params.date,
      profileId: params.profileId,
      activityId: params.activityId,
    });

    if (!session) {
      session = new ActivityTimerSession({
        planId: params.planId,
        date: params.date,
        profileId: params.profileId,
        activityId: params.activityId,
        activityName: params.activityName,
        status: 'running',
        startedAt: new Date(),
        totalPausedMs: 0,
      });
    } else {
      if (session.status === 'paused' && session.pausedAt) {
        session.totalPausedMs = (session.totalPausedMs || 0) + (Date.now() - session.pausedAt.getTime());
        session.pausedAt = undefined;
      } else if (session.status === 'idle' || session.status === 'completed') {
        session.startedAt = new Date();
        session.pausedAt = undefined;
        session.totalPausedMs = 0;
        session.finishedAt = undefined;
      }
      session.status = 'running';
    }

    await session.save();
    return this.getDailyStudyView(params.planId, params.date);
  }

  /**
   * Pause stopwatch timer.
   */
  static async pauseTimer(timerId: string) {
    const session = await ActivityTimerSession.findById(timerId);
    if (!session) throw new AppError('Timer session not found', 404);
    if (session.status === 'running') {
      session.status = 'paused';
      session.pausedAt = new Date();
      await session.save();
    }
    return this.getDailyStudyView(session.planId.toString(), session.date);
  }

  /**
   * Resume stopwatch timer.
   */
  static async resumeTimer(timerId: string) {
    const session = await ActivityTimerSession.findById(timerId);
    if (!session) throw new AppError('Timer session not found', 404);

    // Pause any other running timer for this profile first
    await ActivityTimerSession.updateMany(
      {
        _id: { $ne: session._id },
        planId: session.planId,
        date: session.date,
        profileId: session.profileId,
        status: 'running',
      },
      {
        $set: { status: 'paused', pausedAt: new Date() },
      }
    );

    if (session.status === 'paused' && session.pausedAt) {
      session.totalPausedMs = (session.totalPausedMs || 0) + (Date.now() - session.pausedAt.getTime());
      session.pausedAt = undefined;
      session.status = 'running';
      await session.save();
    } else if (session.status === 'idle') {
      session.startedAt = new Date();
      session.status = 'running';
      await session.save();
    }
    return this.getDailyStudyView(session.planId.toString(), session.date);
  }

  /**
   * Finish stopwatch timer, record actual end timestamp & duration, and mark task completed.
   */
  static async finishTimer(timerId: string) {
    const session = await ActivityTimerSession.findById(timerId);
    if (!session) throw new AppError('Timer session not found', 404);

    const now = new Date();
    session.finishedAt = now;

    let totalMs = 0;
    if (session.startedAt) {
      if (session.status === 'paused' && session.pausedAt) {
        totalMs = session.pausedAt.getTime() - session.startedAt.getTime() - (session.totalPausedMs || 0);
      } else {
        totalMs = now.getTime() - session.startedAt.getTime() - (session.totalPausedMs || 0);
      }
    }
    const totalSec = Math.max(0, Math.floor(totalMs / 1000));
    session.actualDurationSeconds = totalSec;
    session.actualDurationFormatted = formatDuration(Math.round(totalSec / 60));
    session.status = 'completed';
    await session.save();

    // Auto mark activity completed in StudyDayProgress
    const taskMap: Record<string, string> = {
      react: 'reactCompleted',
      dsa: 'dsaCompleted',
      afternoon: 'afternoonCompleted',
      'job-search': 'jobSearchCompleted',
    };
    const taskKey = taskMap[session.activityId];
    if (taskKey) {
      await this.updateTaskProgress({
        planId: session.planId.toString(),
        date: session.date,
        profileId: session.profileId,
        taskKey: taskKey as any,
        completed: true,
      });
    }

    return this.getDailyStudyView(session.planId.toString(), session.date);
  }

  /**
   * Discard timer session and reset to idle.
   */
  static async discardTimer(timerId: string) {
    const session = await ActivityTimerSession.findById(timerId);
    if (!session) throw new AppError('Timer session not found', 404);
    session.status = 'idle';
    session.startedAt = undefined;
    session.pausedAt = undefined;
    session.totalPausedMs = 0;
    session.finishedAt = undefined;
    session.actualDurationSeconds = 0;
    session.actualDurationFormatted = '—';
    await session.save();
    return this.getDailyStudyView(session.planId.toString(), session.date);
  }

  // ----------------------------------------------------
  // Excel-like Schedule Spreadsheet Editor
  // ----------------------------------------------------

  /**
   * Get schedule items for a plan and day number.
   */
  static async getScheduleItems(planId: string, dayNumber: number) {
    let items = await StudyScheduleItem.find({ planId, dayNumber }).sort({ order: 1 });
    if (!items || items.length === 0) {
      const defaultSlots = calculateDailyTimetable(dayNumber, '10:30');
      items = [];
      for (let i = 0; i < defaultSlots.length; i++) {
        const slot = defaultSlots[i];
        const doc = await StudyScheduleItem.create({
          planId,
          dayNumber,
          order: i + 1,
          activityId: slot.id,
          name: slot.name,
          activityType: slot.category,
          targetProfile: 'both',
          videoUrl: slot.videoUrl || '',
          videoRuntimeMinutes: slot.videoRuntimeMinutes || 0,
          extraBufferMinutes: slot.extraBufferMinutes || 0,
          durationMinutes: slot.durationMinutes,
          isFlexible: !!slot.isFlexible,
          isScored: slot.isScored,
          maxPoints: slot.maxPoints,
        });
        items.push(doc);
      }
    }
    return items;
  }

  /**
   * Save edited schedule items for a plan and day number.
   */
  static async saveScheduleItems(planId: string, dayNumber: number, items: any[]) {
    await StudyScheduleItem.deleteMany({ planId, dayNumber });
    const saved = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let dur = it.durationMinutes;
      if (!dur || dur <= 0) {
        if (it.videoRuntimeMinutes) {
          dur = it.videoRuntimeMinutes + (it.extraBufferMinutes || 30);
        } else {
          dur = 60;
        }
      }

      const doc = await StudyScheduleItem.create({
        planId,
        dayNumber,
        order: i + 1,
        activityId: it.activityId || `activity-${Date.now()}-${i}`,
        name: it.name,
        activityType: it.activityType || 'custom',
        targetProfile: it.targetProfile || 'both',
        videoUrl: it.videoUrl || '',
        videoRuntimeMinutes: it.videoRuntimeMinutes || 0,
        extraBufferMinutes: it.extraBufferMinutes || 0,
        durationMinutes: dur,
        isFlexible: !!it.isFlexible,
        isScored: !!it.isScored,
        maxPoints: it.maxPoints || 0,
        notes: it.notes || '',
      });
      saved.push(doc);
    }
    return saved;
  }

  /**
   * Import schedule from CSV or TSV (e.g. pasted from Excel / Google Sheets).
   */
  static async importScheduleFromCsv(planId: string, dayNumber: number, rawContent: string) {
    const lines = rawContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      throw new AppError('Imported content must contain a header and at least one data row', 400);
    }

    const isTab = lines[0].includes('\t');
    const separator = isTab ? '\t' : ',';
    const header = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/[\s_]+/g, ''));

    const activityIdx = header.findIndex(h => h.includes('activity') || h.includes('name') || h.includes('title'));
    if (activityIdx === -1) {
      throw new AppError('Missing required column: Activity / Name', 400);
    }

    const typeIdx = header.findIndex(h => h.includes('type') || h.includes('category'));
    const durationIdx = header.findIndex(h => h.includes('duration') || h.includes('time') || h.includes('minutes'));
    const runtimeIdx = header.findIndex(h => h.includes('runtime') || h.includes('video'));
    const bufferIdx = header.findIndex(h => h.includes('buffer') || h.includes('extra'));
    const profileIdx = header.findIndex(h => h.includes('profile') || h.includes('target'));

    const items: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(separator).map(p => p.trim());
      if (!parts[activityIdx]) continue;

      const name = parts[activityIdx];
      const actType = (typeIdx !== -1 && parts[typeIdx]) ? parts[typeIdx].toLowerCase() : 'custom';
      const videoRuntime = (runtimeIdx !== -1 && parts[runtimeIdx]) ? parseInt(parts[runtimeIdx], 10) || 0 : 0;
      const extraBuffer = (bufferIdx !== -1 && parts[bufferIdx]) ? parseInt(parts[bufferIdx], 10) || 0 : (videoRuntime > 0 ? 30 : 0);
      let dur = (durationIdx !== -1 && parts[durationIdx]) ? parseInt(parts[durationIdx], 10) || 0 : 0;
      if (dur <= 0) {
        dur = videoRuntime > 0 ? videoRuntime + extraBuffer : 60;
      }
      const targetProfile = (profileIdx !== -1 && parts[profileIdx]) ? parts[profileIdx].toLowerCase() : 'both';

      items.push({
        activityId: `imported-${i}`,
        name,
        activityType: ['react', 'break', 'transition', 'dsa', 'system-design', 'project-learning', 'job-search', 'personal', 'custom'].includes(actType) ? actType : 'custom',
        targetProfile: ['both', 'you', 'girlfriend'].includes(targetProfile) ? targetProfile : 'both',
        videoRuntimeMinutes: videoRuntime,
        extraBufferMinutes: extraBuffer,
        durationMinutes: dur,
        isFlexible: actType === 'job-search',
        isScored: ['react', 'dsa', 'system-design', 'project-learning', 'job-search'].includes(actType),
        maxPoints: actType === 'dsa' ? 3 : (['react', 'system-design', 'project-learning', 'job-search'].includes(actType) ? 2 : 0),
      });
    }

    if (items.length === 0) {
      throw new AppError('No valid activity rows found in imported data', 400);
    }

    return this.saveScheduleItems(planId, dayNumber, items);
  }

  /**
   * Export schedule items as CSV.
   */
  static async exportScheduleToCsv(planId: string, dayNumber: number): Promise<string> {
    const items = await this.getScheduleItems(planId, dayNumber);
    const header = 'Day,Activity,Activity Type,Video Runtime,Extra Buffer,Duration,Target Profile,Is Scored,Max Points\n';
    const rows = items.map(it => {
      return `${dayNumber},"${it.name}",${it.activityType},${it.videoRuntimeMinutes || 0},${it.extraBufferMinutes || 0},${it.durationMinutes},${it.targetProfile},${it.isScored},${it.maxPoints}`;
    });
    return header + rows.join('\n');
  }

  /**
   * Reset schedule to default calculated template.
   */
  static async resetScheduleToDefaults(planId: string, dayNumber: number) {
    await StudyScheduleItem.deleteMany({ planId, dayNumber });
    return this.getScheduleItems(planId, dayNumber);
  }
}
