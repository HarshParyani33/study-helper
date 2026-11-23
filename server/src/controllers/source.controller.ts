import { Request, Response, NextFunction } from 'express';
import { Source } from '../models/Source.js';
import { Concept } from '../models/Concept.js';
import { AppError } from '../utils/errorHandler.js';

export class SourceController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { subjectId } = req.query;
      const filter: any = {};
      if (subjectId) filter.subjectId = subjectId;

      const sources = await Source.find(filter)
        .populate('subjectId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, data: sources });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const source = await Source.findById(id).populate('subjectId', 'name').lean();
      if (!source) throw new AppError('Source not found', 404);

      // Find concepts derived from this source
      const concepts = await Concept.find({ sourceIds: source._id }).select('title slug importance difficulty').lean();

      res.json({ success: true, data: { ...source, concepts } });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const source = await Source.findByIdAndDelete(id);
      if (!source) throw new AppError('Source not found', 404);

      // Pull source from concepts
      await Concept.updateMany({ sourceIds: id }, { $pull: { sourceIds: id } });

      res.json({ success: true, message: 'Source deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

