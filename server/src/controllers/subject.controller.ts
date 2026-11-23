import { Request, Response, NextFunction } from 'express';
import { Subject } from '../models/Subject.js';
import { Concept } from '../models/Concept.js';
import { Question } from '../models/Question.js';
import { createSubjectSchema, updateSubjectSchema } from '../validators/subject.schema.js';
import { AppError } from '../utils/errorHandler.js';

export class SubjectController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const subjects = await Subject.find().sort({ name: 1 }).lean();

      // Enrich with concept and question counts
      const enriched = await Promise.all(
        subjects.map(async s => {
          const conceptCount = await Concept.countDocuments({ subjectId: s._id });
          const questionCount = await Question.countDocuments({ subjectId: s._id });
          const dueCount = await Question.countDocuments({
            subjectId: s._id,
            nextReviewAt: { $lte: new Date() },
          });
          return {
            ...s,
            conceptCount,
            questionCount,
            dueCount,
          };
        })
      );

      res.json({ success: true, data: enriched });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const subject = await Subject.findById(id).lean();
      if (!subject) throw new AppError('Subject not found', 404);

      const conceptCount = await Concept.countDocuments({ subjectId: subject._id });
      const questionCount = await Question.countDocuments({ subjectId: subject._id });

      res.json({
        success: true,
        data: { ...subject, conceptCount, questionCount },
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createSubjectSchema.parse(req.body);
      const subject = await Subject.create(parsed);
      res.status(201).json({ success: true, data: subject });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateSubjectSchema.parse(req.body);
      const subject = await Subject.findByIdAndUpdate(id, parsed, { new: true });
      if (!subject) throw new AppError('Subject not found', 404);
      res.json({ success: true, data: subject });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const subject = await Subject.findByIdAndDelete(id);
      if (!subject) throw new AppError('Subject not found', 404);
      res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

