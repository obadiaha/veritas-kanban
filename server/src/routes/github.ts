import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { GitHubService } from '../services/github-service.js';

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
router.get('/status', async (_req, res) => {
  try {
    const status = await githubService.checkGhCli();
    res.json(status);
  } catch (error) {
    console.error('Error checking GitHub CLI status:', error);
    res.status(500).json({ error: 'Failed to check GitHub CLI status' });
  }
});

// POST /api/github/pr - Create a PR for a task
router.post('/pr', async (req, res) => {
  try {
    const input = createPRSchema.parse(req.body);
    const pr = await githubService.createPR(input);
    res.status(201).json(pr);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating PR:', error);
    res.status(500).json({ error: error.message || 'Failed to create PR' });
  }
});

// POST /api/github/pr/:taskId/open - Open PR in browser
router.post('/pr/:taskId/open', async (req, res) => {
  try {
    await githubService.openPRInBrowser(req.params.taskId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error opening PR:', error);
    res.status(500).json({ error: error.message || 'Failed to open PR' });
  }
});

export default router;
