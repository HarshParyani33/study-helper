import { Router } from 'express';
import { FreshStartController } from '../controllers/freshStart.controller.js';

const router = Router();

router.post('/generate', FreshStartController.generate);

export default router;

