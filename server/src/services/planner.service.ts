import { Types } from 'mongoose';
import { StudyPlan, IStudyPlan } from '../models/StudyPlan.js';
import { StudyProfile, IStudyProfile } from '../models/StudyProfile.js';
import { StudyDayProgress, IStudyDayProgress } from '../models/StudyDayProgress.js';
import { DSASession, IDSASession } from '../models/DSASession.js';
import { StudyNote, IStudyNote } from '../models/StudyNote.js';
import { Concept } from '../models/Concept.js';
import { Subject } from '../models/Subject.js';
import { DSA_PATTERNS } from '../data/dsaQuestions.js';
import { REACT_EPISODES } from '../data/reactEpisodes.js';
import {
  calculateDailyTimetable,
  calculateDailyScore,
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
    progress.dsaCompleted = completedDSACount >= 2; // marked complete if target (2-3) reached

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

    // Calculate timetable slots based on selected start time
    const effectiveStartTime = youProgress.startTime || plan.defaultStartTime || '10:30';
    const timetableSlots = calculateDailyTimetable(clampedDayNumber, effectiveStartTime);

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
      timetable: timetableSlots,
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
}
