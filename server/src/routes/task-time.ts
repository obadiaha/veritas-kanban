import { Router, type Router as RouterType } from 'express';
import { TaskService } from '../services/task-service.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { ValidationError } from '../middleware/error-handler.js';

const router: RouterType = Router();
const taskService = new TaskService();

// GET /api/tasks/time/summary - Get time summary by project
router.get('/time/summary', asyncHandler(async (_req, res) => {
  const summary = await taskService.getTimeSummary();
  res.json(summary);
}));

// POST /api/tasks/:id/time/start - Start timer for a task
router.post('/:id/time/start', asyncHandler(async (req, res) => {
  const task = await taskService.startTimer(req.params.id as string);
  res.json(task);
}));

// POST /api/tasks/:id/time/stop - Stop timer for a task
router.post('/:id/time/stop', asyncHandler(async (req, res) => {
  const task = await taskService.stopTimer(req.params.id as string);
  res.json(task);
}));

// POST /api/tasks/:id/time/entry - Add manual time entry
router.post('/:id/time/entry', asyncHandler(async (req, res) => {
  const { duration, description } = req.body;
  if (typeof duration !== 'number' || duration <= 0) {
    throw new ValidationError('Duration must be a positive number (in seconds)');
  }
  const task = await taskService.addTimeEntry((req.params.id as string), duration, description);
  res.json(task);
}));

// DELETE /api/tasks/:id/time/entry/:entryId - Delete a time entry
router.delete('/:id/time/entry/:entryId', asyncHandler(async (req, res) => {
  const task = await taskService.deleteTimeEntry((req.params.id as string), (req.params.entryId as string));
  res.json(task);
}));

export { router as taskTimeRoutes };
