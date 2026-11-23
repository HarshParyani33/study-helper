import { Router } from 'express';
import subjectRoutes from './subject.routes.js';
import conceptRoutes from './concept.routes.js';
import sourceRoutes from './source.routes.js';
import ingestRoutes from './ingest.routes.js';
import recallRoutes from './recall.routes.js';
import freshStartRoutes from './freshStart.routes.js';
import interviewRoutes from './interview.routes.js';
import backupRoutes from './backup.routes.js';
import statsRoutes from './stats.routes.js';
import plannerRoutes from './planner.routes.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'Personal Learning OS API',
  });
});

apiRouter.use('/subjects', subjectRoutes);
apiRouter.use('/concepts', conceptRoutes);
apiRouter.use('/sources', sourceRoutes);
apiRouter.use('/ingest', ingestRoutes);
apiRouter.use('/recall', recallRoutes);
apiRouter.use('/fresh-start', freshStartRoutes);
apiRouter.use('/interview', interviewRoutes);
apiRouter.use('/backup', backupRoutes);
apiRouter.use('/stats', statsRoutes);
apiRouter.use('/planner', plannerRoutes);

export default apiRouter;

