import { Router } from 'express';
import { ConceptController } from '../controllers/concept.controller.js';

const router = Router();

router.get('/', ConceptController.list);
router.get('/:idOrSlug', ConceptController.getByIdOrSlug);
router.post('/', ConceptController.create);
router.put('/:id', ConceptController.update);
router.delete('/:id', ConceptController.delete);
router.post('/:id/questions', ConceptController.addQuestion);

export default router;

