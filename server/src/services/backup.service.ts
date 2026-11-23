import { Subject } from '../models/Subject.js';
import { Source } from '../models/Source.js';
import { Concept } from '../models/Concept.js';
import { Question } from '../models/Question.js';
import { Review } from '../models/Review.js';

export interface BackupData {
  version: string;
  exportedAt: string;
  collections: {
    subjects: any[];
    sources: any[];
    concepts: any[];
    questions: any[];
    reviews: any[];
  };
  counts: {
    subjects: number;
    sources: number;
    concepts: number;
    questions: number;
    reviews: number;
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

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      collections: {
        subjects,
        sources,
        concepts,
        questions,
        reviews,
      },
      counts: {
        subjects: subjects.length,
        sources: sources.length,
        concepts: concepts.length,
        questions: questions.length,
        reviews: reviews.length,
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
    }

    const { subjects, sources, concepts, questions, reviews } = backup.collections;

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

    return {
      restoredAt: new Date().toISOString(),
      counts: {
        subjects: await Subject.countDocuments(),
        sources: await Source.countDocuments(),
        concepts: await Concept.countDocuments(),
        questions: await Question.countDocuments(),
        reviews: await Review.countDocuments(),
      },
    };
  }
}

