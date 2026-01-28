import { Router, type Router as RouterType } from 'express';
import { PreviewService } from '../services/preview-service.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router: RouterType = Router();
const previewService = new PreviewService();

// GET /api/preview - List all running previews
router.get('/', asyncHandler(async (_req, res) => {
  const previews = previewService.getAllPreviews();
  res.json(previews);
}));

// GET /api/preview/:taskId - Get preview status for a task
router.get('/:taskId', asyncHandler(async (req, res) => {
  const status = previewService.getPreviewStatus(req.params.taskId as string);
  if (!status) {
    return res.json({ status: 'stopped' });
  }
  res.json(status);
}));

// GET /api/preview/:taskId/output - Get preview server output
router.get('/:taskId/output', asyncHandler(async (req, res) => {
  const lines = parseInt(req.query.lines as string) || 50;
  const output = previewService.getPreviewOutput((req.params.taskId as string), lines);
  res.json({ output });
}));

// POST /api/preview/:taskId/start - Start preview for a task
router.post('/:taskId/start', asyncHandler(async (req, res) => {
  const preview = await previewService.startPreview(req.params.taskId as string);
  res.status(201).json(preview);
}));

// POST /api/preview/:taskId/stop - Stop preview for a task
router.post('/:taskId/stop', asyncHandler(async (req, res) => {
  await previewService.stopPreview(req.params.taskId as string);
  res.json({ success: true });
}));

export default router;
