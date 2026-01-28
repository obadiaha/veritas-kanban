import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { GitHubService } from '../services/github-service.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { ValidationError } from '../middleware/error-handler.js';

const router: RouterType = Router();
const githubService = new GitHubService();

// Validation schemas
const createPRSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().optional(),
  body: z.string().optional(),
  targetBranch: z.string().optional(),
  draft: z.boolean().optional(),
});

// GET /api/github/status - Check gh CLI status
router.get('/status', asyncHandler(async (_req, res) => {
  const status = await githubService.checkGhCli();
  res.json(status);
}));

// POST /api/github/pr - Create a PR for a task
router.post('/pr', asyncHandler(async (req, res) => {
  let input;
  try {
    input = createPRSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', error.errors);
    }
    throw error;
  }
  const pr = await githubService.createPR(input);
  res.status(201).json(pr);
}));

// POST /api/github/pr/:taskId/open - Open PR in browser
router.post('/pr/:taskId/open', asyncHandler(async (req, res) => {
  await githubService.openPRInBrowser(req.params.taskId as string);
  res.json({ success: true });
}));

export default router;
