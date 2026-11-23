import { Request, Response, NextFunction } from 'express';
import { PlannerService } from '../services/planner.service.js';
import {
  createPlanSchema,
  updatePlanSchema,
  updateTaskProgressSchema,
  updateDSASessionSchema,
  createStudyNoteSchema,
  updateStudyNoteSchema,
  convertNoteToConceptSchema,
  startTimerSchema,
  timerActionSchema,
  batchUpdateScheduleSchema,
  importScheduleSchema,
} from '../validators/planner.schema.js';
import { REACT_EPISODES } from '../data/reactEpisodes.js';

export class PlannerController {
  static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await PlannerService.getAllPlans();
      res.json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  }

  static async getPlanById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const plan = await PlannerService.getPlanById(id);
      res.json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  }

  static async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createPlanSchema.parse(req.body);
      const plan = await PlannerService.createPlan(parsed);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  }

  static async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updatePlanSchema.parse(req.body);
      const plan = await PlannerService.updatePlan(id, parsed);
      res.json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  }

  static async duplicatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const plan = await PlannerService.duplicatePlan(id);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  }

  static async archivePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const plan = await PlannerService.archivePlan(id);
      res.json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  }

  static async getCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = (req.query.planId as string) || 'default';
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;

      const data = await PlannerService.getCalendarData(planId, year, month);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getDailyView(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = (req.query.planId as string) || 'default';
      const today = new Date().toISOString().split('T')[0];
      const date = (req.query.date as string) || today;

      const data = await PlannerService.getDailyStudyView(planId, date);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async updateTaskProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateTaskProgressSchema.parse(req.body);
      await PlannerService.updateTaskProgress(parsed);
      const data = await PlannerService.getDailyStudyView(parsed.planId, parsed.date);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async updateDSASession(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateDSASessionSchema.parse(req.body);
      await PlannerService.updateDSASession(parsed);
      const data = await PlannerService.getDailyStudyView(parsed.planId, parsed.date);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const notes = await PlannerService.getNotes(req.query as any);
      res.json({ success: true, data: notes });
    } catch (err) {
      next(err);
    }
  }

  static async createNote(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createStudyNoteSchema.parse(req.body);
      const note = await PlannerService.createNote(parsed);
      res.status(201).json({ success: true, data: note });
    } catch (err) {
      next(err);
    }
  }

  static async updateNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateStudyNoteSchema.parse(req.body);
      const note = await PlannerService.updateNote(id, parsed);
      res.json({ success: true, data: note });
    } catch (err) {
      next(err);
    }
  }

  static async deleteNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await PlannerService.deleteNote(id);
      res.json({ success: true, message: 'Note deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async convertNoteToConcept(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = convertNoteToConceptSchema.parse(req.body);
      const result = await PlannerService.convertNoteToConcept(parsed);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getDSATopics(req: Request, res: Response) {
    const topics = PlannerService.getDSATopics();
    res.json({ success: true, data: topics });
  }

  static async getReactEpisodes(req: Request, res: Response) {
    res.json({ success: true, data: REACT_EPISODES });
  }

  // Timer Controller Endpoints
  static async startTimer(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = startTimerSchema.parse(req.body);
      const data = await PlannerService.startTimer(parsed);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async pauseTimer(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = timerActionSchema.parse(req.body);
      const data = await PlannerService.pauseTimer(parsed.timerId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async resumeTimer(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = timerActionSchema.parse(req.body);
      const data = await PlannerService.resumeTimer(parsed.timerId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async finishTimer(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = timerActionSchema.parse(req.body);
      const data = await PlannerService.finishTimer(parsed.timerId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async discardTimer(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = timerActionSchema.parse(req.body);
      const data = await PlannerService.discardTimer(parsed.timerId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Schedule Editor Controller Endpoints
  static async getSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = (req.query.planId as string) || 'default';
      const dayNumber = req.query.dayNumber ? parseInt(req.query.dayNumber as string, 10) : 1;
      const plan = await PlannerService.getPlanById(planId);
      const items = await PlannerService.getScheduleItems(plan._id.toString(), dayNumber);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async updateSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = batchUpdateScheduleSchema.parse(req.body);
      const items = await PlannerService.saveScheduleItems(parsed.planId, parsed.dayNumber, parsed.items);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async importSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = importScheduleSchema.parse(req.body);
      const items = await PlannerService.importScheduleFromCsv(parsed.planId, parsed.dayNumber, parsed.csvContent);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async exportSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = (req.query.planId as string) || 'default';
      const dayNumber = req.query.dayNumber ? parseInt(req.query.dayNumber as string, 10) : 1;
      const plan = await PlannerService.getPlanById(planId);
      const csv = await PlannerService.exportScheduleToCsv(plan._id.toString(), dayNumber);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="study-schedule-day-${dayNumber}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async resetSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = (req.body.planId as string) || 'default';
      const dayNumber = req.body.dayNumber ? parseInt(req.body.dayNumber as string, 10) : 1;
      const plan = await PlannerService.getPlanById(planId);
      const items = await PlannerService.resetScheduleToDefaults(plan._id.toString(), dayNumber);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }
}
