import { Router, type Router as RouterType } from 'express';
import { TaskService } from '../services/task-service.js';
import { getSummaryService } from '../services/summary-service.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router: RouterType = Router();
const taskService = new TaskService();
const summaryService = getSummaryService();

// GET /api/summary - Get overall task summary
router.get('/', asyncHandler(async (_req, res) => {
  const tasks = await taskService.listTasks();
  const summary = summaryService.getOverallSummary(tasks);
  res.json(summary);
}));

// GET /api/summary/recent - Get recently completed tasks (for memory sync)
router.get('/recent', asyncHandler(async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const tasks = await taskService.listTasks();
  const recentActivity = summaryService.getRecentActivity(tasks, hours);
  res.json(recentActivity);
}));

// GET /api/summary/memory - Get formatted summary for memory file
router.get('/memory', asyncHandler(async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const tasks = await taskService.listTasks();
  const markdown = summaryService.generateMemoryMarkdown(tasks, hours);
  res.type('text/markdown').send(markdown);
}));

export { router as summaryRoutes };
