import { Router } from 'express';
import { SubjectController } from '../controllers/subject.controller.js';

const router = Router();

router.get('/', SubjectController.list);
router.get('/:id', SubjectController.getById);
router.post('/', SubjectController.create);
router.put('/:id', SubjectController.update);
router.delete('/:id', SubjectController.delete);

export default router;

