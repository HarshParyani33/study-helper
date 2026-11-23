import { Request, Response, NextFunction } from 'express';
import { Concept } from '../models/Concept.js';
import { Question } from '../models/Question.js';
import { createConceptSchema, updateConceptSchema } from '../validators/concept.schema.js';
import { createQuestionSchema } from '../validators/question.schema.js';
import { slugify } from '../utils/slugify.js';
import { AppError } from '../utils/errorHandler.js';
import { FSRSService } from '../services/fsrs.service.js';

export class ConceptController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { subjectId, importance, difficulty, search } = req.query;
      const filter: any = {};

      if (subjectId) filter.subjectId = subjectId;
      if (importance) filter.importance = importance;
      if (difficulty) filter.difficulty = difficulty;
      if (search) {
        filter.$or = [
          { title: { $regex: String(search), $options: 'i' } },
          { explanation: { $regex: String(search), $options: 'i' } },
        ];
      }

      const concepts = await Concept.find(filter)
        .populate('subjectId', 'name')
        .populate('sourceIds', 'title type createdAt')
        .sort({ updatedAt: -1 })
        .lean();

      // Enrich with question count and retention status
      const enriched = await Promise.all(
        concepts.map(async c => {
          const questions = await Question.find({ conceptId: c._id }).lean();
          const dueQuestions = questions.filter(q => new Date(q.nextReviewAt) <= new Date());
          return {
            ...c,
            questionCount: questions.length,
            dueQuestionCount: dueQuestions.length,
          };
        })
      );

      res.json({ success: true, data: enriched });
    } catch (err) {
      next(err);
    }
  }

  static async getByIdOrSlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { idOrSlug } = req.params;
      const { subjectId } = req.query;

      let concept;
      if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
        concept = await Concept.findById(idOrSlug)
          .populate('subjectId', 'name')
          .populate('sourceIds', 'title type fileReference createdAt')
          .lean();
      } else {
        const filter: any = { slug: idOrSlug };
        if (subjectId) filter.subjectId = subjectId;
        concept = await Concept.findOne(filter)
          .populate('subjectId', 'name')
          .populate('sourceIds', 'title type fileReference createdAt')
          .lean();
      }

      if (!concept) throw new AppError('Concept not found', 404);

      const questions = await Question.find({ conceptId: concept._id }).lean();
      res.json({ success: true, data: { ...concept, questions } });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createConceptSchema.parse(req.body);
      const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);

      const concept = await Concept.create({
        ...parsed,
        slug,
      });

      res.status(201).json({ success: true, data: concept });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateConceptSchema.parse(req.body);

      if (parsed.title && !parsed.slug) {
        parsed.slug = slugify(parsed.title);
      }

      const concept = await Concept.findByIdAndUpdate(id, parsed, { new: true });
      if (!concept) throw new AppError('Concept not found', 404);

      res.json({ success: true, data: concept });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const concept = await Concept.findByIdAndDelete(id);
      if (!concept) throw new AppError('Concept not found', 404);

      // Clean up linked questions
      await Question.deleteMany({ conceptId: id });

      res.json({ success: true, message: 'Concept and associated questions deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async addQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const concept = await Concept.findById(id);
      if (!concept) throw new AppError('Concept not found', 404);

      const parsed = createQuestionSchema.parse({
        ...req.body,
        conceptId: id,
        subjectId: concept.subjectId.toString(),
      });

      const initialCard = FSRSService.createInitialCard();
      const question = await Question.create({
        ...parsed,
        conceptId: concept._id,
        subjectId: concept.subjectId,
        nextReviewAt: initialCard.due,
        fsrsCard: initialCard,
      });

      res.status(201).json({ success: true, data: question });
    } catch (err) {
      next(err);
    }
  }
}

