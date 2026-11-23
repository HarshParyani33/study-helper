import { Router } from 'express';
import multer from 'multer';
import { IngestController } from '../controllers/ingest.controller.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

router.post('/raw', IngestController.ingestRaw);
router.post('/file', upload.single('file'), IngestController.ingestFile);

export default router;

