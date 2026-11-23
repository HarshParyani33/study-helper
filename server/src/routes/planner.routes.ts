import { Router } from 'express';
import { PlannerController } from '../controllers/planner.controller.js';

const router = Router();

// Plans
router.get('/plans', PlannerController.getPlans);
router.get('/plans/:id', PlannerController.getPlanById);
router.post('/plans', PlannerController.createPlan);
router.put('/plans/:id', PlannerController.updatePlan);
router.post('/plans/:id/duplicate', PlannerController.duplicatePlan);
router.post('/plans/:id/archive', PlannerController.archivePlan);

// Calendar & Daily
router.get('/calendar', PlannerController.getCalendar);
router.get('/daily', PlannerController.getDailyView);
router.post('/task-progress', PlannerController.updateTaskProgress);
router.post('/dsa-session', PlannerController.updateDSASession);

// Live Timers
router.post('/timer/start', PlannerController.startTimer);
router.post('/timer/pause', PlannerController.pauseTimer);
router.post('/timer/resume', PlannerController.resumeTimer);
router.post('/timer/finish', PlannerController.finishTimer);
router.post('/timer/discard', PlannerController.discardTimer);

// Schedule Spreadsheet Editor
router.get('/schedule', PlannerController.getSchedule);
router.put('/schedule', PlannerController.updateSchedule);
router.post('/schedule/import', PlannerController.importSchedule);
router.get('/schedule/export', PlannerController.exportSchedule);
router.post('/schedule/reset', PlannerController.resetSchedule);

// Notes
router.get('/notes', PlannerController.getNotes);
router.post('/notes', PlannerController.createNote);
router.put('/notes/:id', PlannerController.updateNote);
router.delete('/notes/:id', PlannerController.deleteNote);
router.post('/notes/convert-to-concept', PlannerController.convertNoteToConcept);

// Static Datasets
router.get('/dsa/topics', PlannerController.getDSATopics);
router.get('/react/episodes', PlannerController.getReactEpisodes);

export default router;
