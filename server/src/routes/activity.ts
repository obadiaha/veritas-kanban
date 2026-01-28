import { Router, type Router as RouterType } from 'express';
import { activityService } from '../services/activity-service.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router: RouterType = Router();

// GET /api/activity - Get recent activities
router.get('/', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const activities = await activityService.getActivities(limit);
  res.json(activities);
}));

// DELETE /api/activity - Clear all activities
router.delete('/', asyncHandler(async (_req, res) => {
  await activityService.clearActivities();
  res.status(204).send();
}));

export default router;
