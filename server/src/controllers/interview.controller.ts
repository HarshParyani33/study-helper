import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service.js';

export class InterviewController {
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { subjectId, difficulty, interviewDate } = req.body;
      if (!subjectId) {
        res.status(400).json({ success: false, error: 'subjectId is required' });
        return;
      }

      const result = await InterviewService.generate(
        subjectId,
        difficulty || 'senior',
        interviewDate
      );

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

