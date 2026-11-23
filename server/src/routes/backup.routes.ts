import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller.js';

const router = Router();

router.get('/export', BackupController.export);
router.post('/restore', BackupController.restore);

export default router;

