import { Router, type Router as RouterType } from 'express';
import { DiffService } from '../services/diff-service.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { ValidationError } from '../middleware/error-handler.js';

const router: RouterType = Router();
const diffService = new DiffService();

// GET /api/diff/:taskId - Get diff summary for task
router.get('/:taskId', asyncHandler(async (req, res) => {
  const summary = await diffService.getDiffSummary(req.params.taskId as string);
  res.json(summary);
}));

// GET /api/diff/:taskId/file - Get diff for specific file
router.get('/:taskId/file', asyncHandler(async (req, res) => {
  const path = req.query.path as string;
  if (!path || typeof path !== 'string') {
    throw new ValidationError('File path is required');
  }
  const diff = await diffService.getFileDiff((req.params.taskId as string), path);
  res.json(diff);
}));

// GET /api/diff/:taskId/full - Get full diff for all files
router.get('/:taskId/full', asyncHandler(async (req, res) => {
  const diffs = await diffService.getFullDiff(req.params.taskId as string);
  res.json(diffs);
}));

export { router as diffRoutes };
