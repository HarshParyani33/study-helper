import { Request, Response, NextFunction } from 'express';
import { RecallService } from '../services/recall.service.js';
import { submitReviewSchema, evaluateAnswerSchema } from '../validators/review.schema.js';

export class RecallController {
  static async getDue(req: Request, res: Response, next: NextFunction) {
    try {
      const { subjectId, limit } = req.query;
      const questions = await RecallService.getDueQuestions(
        subjectId as string,
        limit ? parseInt(String(limit), 10) : 20
      );
      res.json({ success: true, count: questions.length, data: questions });
    } catch (err) {
      next(err);
    }
  }

  static async getSurprise(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const questions = await RecallService.getSurpriseRecall(
        limit ? parseInt(String(limit), 10) : 10
      );
      res.json({ success: true, count: questions.length, data: questions });
    } catch (err) {
      next(err);
    }
  }

  static async submitReview(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = submitReviewSchema.parse(req.body);
      const result = await RecallService.submitReview(
        parsed.questionId,
        parsed.rating,
        parsed.userAnswer,
        parsed.evaluation,
        parsed.elapsedMs
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async evaluateAnswer(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = evaluateAnswerSchema.parse(req.body);
      const evaluation = await RecallService.evaluateAnswer(
        parsed.questionId,
        parsed.userAnswer
      );
      res.json({ success: true, data: evaluation });
    } catch (err) {
      next(err);
    }
  }
}

