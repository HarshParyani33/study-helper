import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller.js';

const router = Router();

router.post('/generate', InterviewController.generate);

export default router;

