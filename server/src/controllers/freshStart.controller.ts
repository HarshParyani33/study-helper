import { Request, Response, NextFunction } from 'express';
import { FreshStartService } from '../services/freshStart.service.js';

export class FreshStartController {
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { subjectId, inactivityDuration } = req.body;
      if (!subjectId) {
        res.status(400).json({ success: false, error: 'subjectId is required' });
        return;
      }

      const result = await FreshStartService.generate(
        subjectId,
        inactivityDuration || '30 days'
      );

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

