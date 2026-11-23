import { Subject } from '../models/Subject.js';
import { Source } from '../models/Source.js';
import { Concept } from '../models/Concept.js';
import { Question } from '../models/Question.js';
import { Review } from '../models/Review.js';
import { StudyPlan } from '../models/StudyPlan.js';
import { StudyProfile } from '../models/StudyProfile.js';
import { StudyDayProgress } from '../models/StudyDayProgress.js';
import { DSASession } from '../models/DSASession.js';
import { StudyNote } from '../models/StudyNote.js';
import { ActivityTimerSession } from '../models/ActivityTimerSession.js';
import { StudyScheduleItem } from '../models/StudyScheduleItem.js';

export interface BackupData {
  version: string;
  exportedAt: string;
  collections: {
    subjects: any[];
    sources: any[];
    concepts: any[];
    questions: any[];
    reviews: any[];
    studyPlans?: any[];
    studyProfiles?: any[];
    studyDayProgress?: any[];
    dsaSessions?: any[];
    studyNotes?: any[];
    activityTimerSessions?: any[];
    studyScheduleItems?: any[];
  };
  counts: {
    subjects: number;
    sources: number;
    concepts: number;
    questions: number;
    reviews: number;
    studyPlans?: number;
    studyProfiles?: number;
    studyDayProgress?: number;
    dsaSessions?: number;
    studyNotes?: number;
    activityTimerSessions?: number;
    studyScheduleItems?: number;
  };
}

export class BackupService {
  /**
   * Export complete database backup as JSON.
   */
  static async exportBackup(): Promise<BackupData> {
    const subjects = await Subject.find().lean();
    const sources = await Source.find().lean();
    const concepts = await Concept.find().lean();
    const questions = await Question.find().lean();
    const reviews = await Review.find().lean();
    const studyPlans = await StudyPlan.find().lean();
    const studyProfiles = await StudyProfile.find().lean();
    const studyDayProgress = await StudyDayProgress.find().lean();
    const dsaSessions = await DSASession.find().lean();
    const studyNotes = await StudyNote.find().lean();
    const activityTimerSessions = await ActivityTimerSession.find().lean();
    const studyScheduleItems = await StudyScheduleItem.find().lean();

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      collections: {
        subjects,
        sources,
        concepts,
        questions,
        reviews,
        studyPlans,
        studyProfiles,
        studyDayProgress,
        dsaSessions,
        studyNotes,
        activityTimerSessions,
        studyScheduleItems,
      },
      counts: {
        subjects: subjects.length,
        sources: sources.length,
        concepts: concepts.length,
        questions: questions.length,
        reviews: reviews.length,
        studyPlans: studyPlans.length,
        studyProfiles: studyProfiles.length,
        studyDayProgress: studyDayProgress.length,
        dsaSessions: dsaSessions.length,
        studyNotes: studyNotes.length,
        activityTimerSessions: activityTimerSessions.length,
        studyScheduleItems: studyScheduleItems.length,
      },
    };
  }

  /**
   * Restore database from backup data.
   */
  static async restoreBackup(backup: BackupData, clearExisting = false): Promise<any> {
    if (!backup || !backup.collections) {
      throw new Error('Invalid backup data format');
    }

    if (clearExisting) {
      await Review.deleteMany({});
      await Question.deleteMany({});
      await Concept.deleteMany({});
      await Source.deleteMany({});
      await Subject.deleteMany({});
      await StudyDayProgress.deleteMany({});
      await DSASession.deleteMany({});
      await StudyNote.deleteMany({});
      await StudyProfile.deleteMany({});
      await StudyPlan.deleteMany({});
    }

    const {
      subjects,
      sources,
      concepts,
      questions,
      reviews,
      studyPlans,
      studyProfiles,
      studyDayProgress,
      dsaSessions,
      studyNotes,
      activityTimerSessions,
      studyScheduleItems,
    } = backup.collections;

    if (subjects?.length) {
      for (const s of subjects) {
        await Subject.findByIdAndUpdate(s._id, s, { upsert: true, new: true });
      }
    }

    if (sources?.length) {
      for (const s of sources) {
        await Source.findByIdAndUpdate(s._id, s, { upsert: true, new: true });
      }
    }

    if (concepts?.length) {
      for (const c of concepts) {
        await Concept.findByIdAndUpdate(c._id, c, { upsert: true, new: true });
      }
    }

    if (questions?.length) {
      for (const q of questions) {
        await Question.findByIdAndUpdate(q._id, q, { upsert: true, new: true });
      }
    }

    if (reviews?.length) {
      for (const r of reviews) {
        await Review.findByIdAndUpdate(r._id, r, { upsert: true, new: true });
      }
    }

    // Restore Planner collections if present
    if (studyPlans?.length) {
      for (const p of studyPlans) {
        await StudyPlan.findByIdAndUpdate(p._id, p, { upsert: true, new: true });
      }
    }

    if (studyProfiles?.length) {
      for (const p of studyProfiles) {
        await StudyProfile.findByIdAndUpdate(p._id, p, { upsert: true, new: true });
      }
    }

    if (studyDayProgress?.length) {
      for (const dp of studyDayProgress) {
        await StudyDayProgress.findByIdAndUpdate(dp._id, dp, { upsert: true, new: true });
      }
    }

    if (dsaSessions?.length) {
      for (const ds of dsaSessions) {
        await DSASession.findByIdAndUpdate(ds._id, ds, { upsert: true, new: true });
      }
    }

    if (studyNotes?.length) {
      for (const sn of studyNotes) {
        await StudyNote.findByIdAndUpdate(sn._id, sn, { upsert: true, new: true });
      }
    }

    if (activityTimerSessions?.length) {
      for (const ats of activityTimerSessions) {
        await ActivityTimerSession.findByIdAndUpdate(ats._id, ats, { upsert: true, new: true });
      }
    }

    if (studyScheduleItems?.length) {
      for (const ssi of studyScheduleItems) {
        await StudyScheduleItem.findByIdAndUpdate(ssi._id, ssi, { upsert: true, new: true });
      }
    }

    return {
      restoredAt: new Date().toISOString(),
      counts: {
        subjects: await Subject.countDocuments(),
        sources: await Source.countDocuments(),
        concepts: await Concept.countDocuments(),
        questions: await Question.countDocuments(),
        reviews: await Review.countDocuments(),
        studyPlans: await StudyPlan.countDocuments(),
        studyProfiles: await StudyProfile.countDocuments(),
        studyDayProgress: await StudyDayProgress.countDocuments(),
        dsaSessions: await DSASession.countDocuments(),
        studyNotes: await StudyNote.countDocuments(),
        activityTimerSessions: await ActivityTimerSession.countDocuments(),
        studyScheduleItems: await StudyScheduleItem.countDocuments(),
      },
    };
  }
}
