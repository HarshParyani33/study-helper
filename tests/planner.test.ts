import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { StudyPlan } from '../server/src/models/StudyPlan.js';
import { StudyDayProgress } from '../server/src/models/StudyDayProgress.js';
import { DSASession } from '../server/src/models/DSASession.js';
import { StudyNote } from '../server/src/models/StudyNote.js';
import { Subject } from '../server/src/models/Subject.js';
import { Concept } from '../server/src/models/Concept.js';
import { PlannerService } from '../server/src/services/planner.service.js';
import { DSA_PATTERNS } from '../server/src/data/dsaQuestions.js';
import { REACT_EPISODES } from '../server/src/data/reactEpisodes.js';
import {
  calculateDailyTimetable,
  calculateDailyScore,
  getAfternoonActivityForDay,
} from '../server/src/utils/plannerCalculations.js';
import { BackupService } from '../server/src/services/backup.service.js';

describe('Study Planner Module & Shared Roadmap', () => {
  beforeAll(async () => {
    await setupTestDB();
    await clearTestDB();
  }, 45000);

  afterAll(async () => {
    await clearTestDB();
  });

  describe('Static Curated Data Integrity', () => {
    it('should have exactly 16 DSA patterns with 10 problems each (160 total)', () => {
      expect(DSA_PATTERNS).toHaveLength(16);
      let totalQuestions = 0;

      for (const pattern of DSA_PATTERNS) {
        expect(pattern.id).toBeTruthy();
        expect(pattern.name).toBeTruthy();
        expect(pattern.questions).toHaveLength(10);

        for (const q of pattern.questions) {
          expect(q.problemNumber).toBeGreaterThan(0);
          expect(q.title).toBeTruthy();
          expect(['Easy', 'Medium', 'Hard']).toContain(q.difficulty);
          expect(q.url).toMatch(/^https:\/\/leetcode\.com\/problems\//);
          totalQuestions++;
        }
      }

      expect(totalQuestions).toBe(160);
    });

    it('should have exactly 10 Coder Army React episodes with accurate runtimes and study buffers', () => {
      expect(REACT_EPISODES).toHaveLength(10);

      for (const ep of REACT_EPISODES) {
        expect(ep.day).toBeGreaterThanOrEqual(1);
        expect(ep.day).toBeLessThanOrEqual(10);
        expect(ep.episodeNumber).toBeGreaterThanOrEqual(1);
        expect(ep.title).toBeTruthy();
        expect(ep.runtimeSeconds).toBeGreaterThan(0);
        // Study time must equal runtime + 30 minutes buffer (1800s)
        expect(ep.totalStudySeconds).toBe(ep.runtimeSeconds + 1800);
        expect(ep.videoUrl).toMatch(/^https:\/\/(www\.)?youtube\.com\/watch\?v=/);
      }
    });
  });

  describe('Timetable & Schedule Calculations', () => {
    it('should calculate accurate timetable slots starting at 10:30 AM', () => {
      const slots = calculateDailyTimetable(1, '10:30');
      // 7 slots: react, lunch, dsa, afternoon, job-search, bigg-boss, valorant
      expect(slots).toHaveLength(7);

      // Slot 1: React Session
      const reactSlot = slots[0];
      expect(reactSlot.id).toBe('react');
      expect(reactSlot.startTimeFormatted).toBe('10:30 AM');
      expect(reactSlot.maxPoints).toBe(2);
      expect(reactSlot.isScored).toBe(true);

      // Slot 2: Lunch Break (35m)
      const lunchSlot = slots[1];
      expect(lunchSlot.id).toBe('lunch');
      expect(lunchSlot.durationFormatted).toBe('35m');
      expect(lunchSlot.isScored).toBe(false);

      // Slot 3: DSA Practice (90m)
      const dsaSlot = slots[2];
      expect(dsaSlot.id).toBe('dsa');
      expect(dsaSlot.durationFormatted).toBe('1h 30m');
      expect(dsaSlot.maxPoints).toBe(3);

      // Slot 4: Afternoon Activity (Day 1: Project Learning)
      const afternoonSlot = slots[3];
      expect(afternoonSlot.id).toBe('afternoon');
      expect(afternoonSlot.name).toContain('Project Learning — 1 hour');
      expect(afternoonSlot.maxPoints).toBe(2);

      // Slot 5: Job Search
      const jobSlot = slots[4];
      expect(jobSlot.id).toBe('job-search');
      expect(jobSlot.maxPoints).toBe(2);

      // Slots 6 & 7: Personal Routine (Bigg Boss & Valorant)
      const bbSlot = slots[5];
      expect(bbSlot.id).toBe('bigg-boss');
      expect(bbSlot.startTimeFormatted).toBe('9:00 PM');
      expect(bbSlot.endTimeFormatted).toBe('10:00 PM');
      expect(bbSlot.isScored).toBe(false);

      const valSlot = slots[6];
      expect(valSlot.id).toBe('valorant');
      expect(valSlot.startTimeFormatted).toBe('10:00 PM');
      expect(valSlot.endTimeFormatted).toBe('12:00 AM');
      expect(valSlot.isScored).toBe(false);
    });

    it('should alternate afternoon activity between Project Learning (odd days) and System Design (even days)', () => {
      // Day 1: Project Learning
      const day1Activity = getAfternoonActivityForDay(1);
      expect(day1Activity.title).toContain('Project Learning — 1 hour');

      // Day 2: System Design — Padho with Pratyush
      const day2Activity = getAfternoonActivityForDay(2);
      expect(day2Activity.title).toContain('System Design — Padho with Pratyush');

      // Day 3: Project Learning
      const day3Activity = getAfternoonActivityForDay(3);
      expect(day3Activity.title).toContain('Project Learning — 1 hour');

      // Day 4: System Design
      const day4Activity = getAfternoonActivityForDay(4);
      expect(day4Activity.title).toContain('System Design — Padho with Pratyush');
    });

    it('should support dynamic start time switching (11:00 AM)', () => {
      const slots = calculateDailyTimetable(1, '11:00');
      expect(slots[0].startTimeFormatted).toBe('11:00 AM');
    });
  });

  describe('Scoring Model Verification (Exact Out of 10)', () => {
    it('should award 0 points when nothing is done', () => {
      const { totalScore, breakdown } = calculateDailyScore({
        reactCompleted: false,
        dsaCompletedQuestionsCount: 0,
        afternoonCompleted: false,
        jobSearchCompleted: false,
        hasNonEmptyNote: false,
      });

      expect(totalScore).toBe(0);
      expect(breakdown).toEqual({
        react: 0,
        dsa: 0,
        afternoon: 0,
        jobSearch: 0,
        notes: 0,
      });
    });

    it('should score DSA dynamically (1 pt for 1, 2 pts for 2, 3 pts for 3+)', () => {
      // 1 question
      const score1 = calculateDailyScore({
        reactCompleted: false,
        dsaCompletedQuestionsCount: 1,
        afternoonCompleted: false,
        jobSearchCompleted: false,
        hasNonEmptyNote: false,
      });
      expect(score1.totalScore).toBe(1);
      expect(score1.breakdown.dsa).toBe(1);

      // 2 questions
      const score2 = calculateDailyScore({
        reactCompleted: false,
        dsaCompletedQuestionsCount: 2,
        afternoonCompleted: false,
        jobSearchCompleted: false,
        hasNonEmptyNote: false,
      });
      expect(score2.totalScore).toBe(2);
      expect(score2.breakdown.dsa).toBe(2);

      // 3 questions
      const score3 = calculateDailyScore({
        reactCompleted: false,
        dsaCompletedQuestionsCount: 3,
        afternoonCompleted: false,
        jobSearchCompleted: false,
        hasNonEmptyNote: false,
      });
      expect(score3.totalScore).toBe(3);
      expect(score3.breakdown.dsa).toBe(3);

      // 10 questions solved capped at 3 pts max
      const score10 = calculateDailyScore({
        reactCompleted: false,
        dsaCompletedQuestionsCount: 10,
        afternoonCompleted: false,
        jobSearchCompleted: false,
        hasNonEmptyNote: false,
      });
      expect(score10.totalScore).toBe(3);
      expect(score10.breakdown.dsa).toBe(3);
    });

    it('should reach maximum 10/10 points when all 5 activities are completed', () => {
      const { totalScore, breakdown } = calculateDailyScore({
        reactCompleted: true, // +2
        dsaCompletedQuestionsCount: 3, // +3
        afternoonCompleted: true, // +2
        jobSearchCompleted: true, // +2
        hasNonEmptyNote: true, // +1
      });

      expect(totalScore).toBe(10);
      expect(breakdown).toEqual({
        react: 2,
        dsa: 3,
        afternoon: 2,
        jobSearch: 2,
        notes: 1,
      });
    });
  });

  describe('Planner Service & Two Independent Profiles', () => {
    let testPlanId: string;
    const testDate = '2026-11-24';

    it('should initialize default 10-day React + DSA plan and profiles', async () => {
      const plan = await PlannerService.ensureDefaultData();
      expect(plan.name).toContain('10-Day React + DSA Preparation');
      expect(plan.startDate).toBe('2026-11-24');
      expect(plan.endDate).toBe('2026-12-03');
      expect(plan.totalDays).toBe(10);
      expect(plan.status).toBe('active');
      testPlanId = (plan._id as any).toString();

      const allPlans = await PlannerService.getAllPlans();
      expect(allPlans.length).toBeGreaterThanOrEqual(1);
    });

    it('should maintain independent task progress and scores for You and Girlfriend', async () => {
      // Complete React for 'you'
      await PlannerService.updateTaskProgress({
        planId: testPlanId,
        date: testDate,
        profileId: 'you',
        taskKey: 'reactCompleted',
        completed: true,
      });

      const youUpdate = await PlannerService.getDailyStudyView(testPlanId, testDate);
      expect(youUpdate.profiles.you.progress.reactCompleted).toBe(true);
      expect(youUpdate.profiles.you.score).toBe(2);

      // Girlfriend should still have 0 score and incomplete React
      expect(youUpdate.profiles.girlfriend.progress.reactCompleted).toBe(false);
      expect(youUpdate.profiles.girlfriend.score).toBe(0);

      // Now complete Job Search for 'girlfriend'
      await PlannerService.updateTaskProgress({
        planId: testPlanId,
        date: testDate,
        profileId: 'girlfriend',
        taskKey: 'jobSearchCompleted',
        completed: true,
        jobSearchDetails: {
          role: 'Senior Frontend Engineer',
          company: 'Google',
          activity: 'Applied',
          note: 'Referral submitted',
        },
      });

      const gfUpdate = await PlannerService.getDailyStudyView(testPlanId, testDate);
      expect(gfUpdate.profiles.girlfriend.progress.jobSearchCompleted).toBe(true);
      expect(gfUpdate.profiles.girlfriend.score).toBe(2);
      expect(gfUpdate.profiles.girlfriend.progress.jobSearchDetails?.company).toBe('Google');

      // You should still have score 2 and incomplete Job Search
      expect(gfUpdate.profiles.you.progress.jobSearchCompleted).toBe(false);
      expect(gfUpdate.profiles.you.score).toBe(2);
    });

    it('should track independent DSA topics and problem completions', async () => {
      // You works on Two Pointers, solves problem 167 and 15
      await PlannerService.updateDSASession({
        planId: testPlanId,
        date: testDate,
        profileId: 'you',
        topicId: 'two-pointers',
        completedProblemNumbers: [167, 15],
      });

      // Girlfriend works on Binary Search, solves problem 704
      await PlannerService.updateDSASession({
        planId: testPlanId,
        date: testDate,
        profileId: 'girlfriend',
        topicId: 'binary-search',
        completedProblemNumbers: [704],
      });

      const dayView = await PlannerService.getDailyStudyView(testPlanId, testDate);

      // Verify You's DSA
      expect(dayView.profiles.you.dsa.topicId).toBe('two-pointers');
      expect(dayView.profiles.you.dsa.completedProblemNumbers).toEqual([167, 15]);
      expect(dayView.profiles.you.dsa.completedCount).toBe(2);
      // You has React (2) + DSA 2 solved (2) = 4 pts
      expect(dayView.profiles.you.score).toBe(4);

      // Verify Girlfriend's DSA
      expect(dayView.profiles.girlfriend.dsa.topicId).toBe('binary-search');
      expect(dayView.profiles.girlfriend.dsa.completedProblemNumbers).toEqual([704]);
      expect(dayView.profiles.girlfriend.dsa.completedCount).toBe(1);
      // Girlfriend has Job Search (2) + DSA 1 solved (1) = 3 pts
      expect(dayView.profiles.girlfriend.score).toBe(3);
    });

    it('should award +1 point for saving a note and support converting note into Concept Library', async () => {
      // Create a subject in the Concept Library first
      await Subject.create({
        name: 'React Internals',
        description: 'Virtual DOM, Fiber architecture, and hooks implementation',
      });

      // Add a note for You
      const note = await PlannerService.createNote({
        planId: testPlanId,
        date: testDate,
        profileId: 'you',
        activityType: 'react',
        title: 'React Fiber Reconciliation Cycle',
        approach: 'Work-in-progress tree with alternate pointer to current tree.',
        keyObservation: 'Avoid side effects during render phase because it can be aborted.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
      });

      expect(note._id).toBeTruthy();

      // Check daily score: You had 4 pts, now with note should have 5 pts (React: 2, DSA: 2, Notes: 1)
      const refreshedDay = await PlannerService.getDailyStudyView(testPlanId, testDate);
      expect(refreshedDay.profiles.you.score).toBe(5);
      expect(refreshedDay.profiles.you.scoreBreakdown.notes).toBe(1);

      // Convert note to Concept Library entry
      const conceptResult = await PlannerService.convertNoteToConcept({
        noteId: (note._id as any).toString(),
        subjectName: 'React Internals',
        importance: 'high',
        difficulty: 'hard',
      });

      expect(conceptResult.success).toBe(true);
      expect(conceptResult.conceptTitle).toBe('React Fiber Reconciliation Cycle');

      // Verify note is linked to concept
      const updatedNote = await StudyNote.findById(note._id);
      expect(updatedNote?.relatedConceptId?.toString()).toBe(conceptResult.conceptId);
    });

    it('should aggregate monthly calendar with dual-profile completion dots and scores', async () => {
      const cal = await PlannerService.getCalendarData(testPlanId, 2026, 11);
      expect(cal.year).toBe(2026);
      expect(cal.month).toBe(11);
      expect(cal.days.length).toBe(30);

      // Check Day 24 (2026-11-24)
      const day24 = cal.days.find(d => d.date === '2026-11-24');
      expect(day24).toBeDefined();
      expect(day24?.isInActivePlan).toBe(true);
      expect(day24?.dayNumber).toBe(1);
      expect(day24?.you.score).toBe(5);
      expect(day24?.you.reactCompleted).toBe(true);
      expect(day24?.you.dsaQuestionsSolved).toBe(2);
      expect(day24?.girlfriend.score).toBe(3);
      expect(day24?.girlfriend.jobSearchCompleted).toBe(true);
      expect(day24?.girlfriend.dsaQuestionsSolved).toBe(1);
    });

    it('should support plan duplication and archiving', async () => {
      const cloned = await PlannerService.duplicatePlan(testPlanId);
      expect(cloned.name).toContain('Copy of');
      expect(cloned.totalDays).toBe(10);

      const archived = await PlannerService.archivePlan(cloned._id.toString());
      expect(archived.status).toBe('archived');
    });

    it('should export and restore planner data in BackupService', async () => {
      const backup = await BackupService.exportBackup();
      expect(backup.counts.studyPlans).toBeGreaterThanOrEqual(1);
      expect(backup.counts.studyProfiles).toBe(2);
      expect(backup.counts.studyDayProgress).toBeGreaterThanOrEqual(1);
      expect(backup.counts.dsaSessions).toBeGreaterThanOrEqual(1);
      expect(backup.counts.studyNotes).toBeGreaterThanOrEqual(1);

      // Restore backup into clean DB
      const restoreResult = await BackupService.restoreBackup(backup, true);
      expect(restoreResult.counts.studyPlans).toBeGreaterThanOrEqual(1);
      expect(restoreResult.counts.studyProfiles).toBe(2);
      expect(restoreResult.counts.studyDayProgress).toBeGreaterThanOrEqual(1);
      expect(restoreResult.counts.dsaSessions).toBeGreaterThanOrEqual(1);
      expect(restoreResult.counts.studyNotes).toBeGreaterThanOrEqual(1);
    });
  });
});
