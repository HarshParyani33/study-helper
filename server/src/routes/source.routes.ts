import { Router } from 'express';
import { SourceController } from '../controllers/source.controller.js';

const router = Router();

router.get('/', SourceController.list);
router.get('/:id', SourceController.getById);
router.delete('/:id', SourceController.delete);

export default router;

