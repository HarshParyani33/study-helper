import { Router } from 'express';
import { RecallController } from '../controllers/recall.controller.js';

const router = Router();

router.get('/due', RecallController.getDue);
router.get('/surprise', RecallController.getSurprise);
router.post('/review', RecallController.submitReview);
router.post('/evaluate', RecallController.evaluateAnswer);

export default router;

