import { Request, Response, NextFunction } from 'express';
import { BackupService } from '../services/backup.service.js';

export class BackupController {
  static async export(req: Request, res: Response, next: NextFunction) {
    try {
      const backup = await BackupService.exportBackup();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="learning-os-backup-${new Date().toISOString().split('T')[0]}.json"`
      );
      res.json(backup);
    } catch (err) {
      next(err);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const backupData = req.body;
      const clearExisting = req.query.clearExisting === 'true';
      const result = await BackupService.restoreBackup(backupData, clearExisting);
      res.json({ success: true, message: 'Database restored successfully', data: result });
    } catch (err) {
      next(err);
    }
  }
}

