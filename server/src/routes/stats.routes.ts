import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller.js';

const router = Router();

router.get('/summary', StatsController.getDashboardSummary);
router.get('/graph', StatsController.getKnowledgeGraph);

export default router;

