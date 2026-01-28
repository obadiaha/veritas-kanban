import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { TaskService } from '../services/task-service.js';
import { nanoid } from 'nanoid';

const router: RouterType = Router();
const taskService = new TaskService();

// Schema for starting automation
const startAutomationSchema = z.object({
  sessionKey: z.string().optional(),
});

// Schema for completing automation
const completeAutomationSchema = z.object({
  result: z.string().optional(),
  status: z.enum(['complete', 'failed']).default('complete'),
});

// POST /api/automation/:taskId/start - Start automation task via Veritas sub-agent
router.post('/:taskId/start', async (req, res) => {
  try {
    const task = await taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.type !== 'automation') {
      return res.status(400).json({ error: 'Task must be of type "automation"' });
    }

    const input = startAutomationSchema.parse(req.body);
    const attemptId = `attempt_${nanoid(8)}`;

    // Update task with automation tracking
    const updated = await taskService.updateTask(task.id, {
      status: 'in-progress',
      attempt: {
        id: attemptId,
        agent: 'veritas',
        status: 'running',
        started: new Date().toISOString(),
      },
      automation: {
        sessionKey: input.sessionKey,
        spawnedAt: new Date().toISOString(),
      },
    });

    res.json({
      taskId: task.id,
      attemptId,
      title: task.title,
      description: task.description,
      project: task.project,
      automation: updated?.automation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error starting automation:', error);
    res.status(500).json({ error: 'Failed to start automation' });
  }
});

// POST /api/automation/:taskId/complete - Mark automation task as complete
router.post('/:taskId/complete', async (req, res) => {
  try {
    const task = await taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.attempt || task.attempt.agent !== 'veritas') {
      return res.status(400).json({ error: 'Task does not have an active veritas attempt' });
    }

    const input = completeAutomationSchema.parse(req.body);
    const isSuccess = input.status === 'complete';

    // Update task
    const updated = await taskService.updateTask(task.id, {
      status: isSuccess ? 'done' : 'blocked',
      attempt: {
        ...task.attempt,
        status: isSuccess ? 'complete' : 'failed',
        ended: new Date().toISOString(),
      },
      automation: {
        ...task.automation,
        completedAt: new Date().toISOString(),
        result: input.result,
      },
    });

    res.json({
      taskId: task.id,
      status: isSuccess ? 'complete' : 'failed',
      automation: updated?.automation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error completing automation:', error);
    res.status(500).json({ error: 'Failed to complete automation' });
  }
});

// GET /api/automation/pending - List automation tasks pending execution
router.get('/pending', async (_req, res) => {
  try {
    const tasks = await taskService.listTasks();
    
    // Find automation tasks that are:
    // 1. Type automation AND status todo (not yet started)
    // 2. OR have a failed veritas attempt and need retry
    const pending = tasks.filter(task => {
      if (task.type !== 'automation') return false;
      if (task.status === 'todo') return true;
      if (task.status === 'blocked' && task.attempt?.agent === 'veritas' && task.attempt?.status === 'failed') {
        return true; // Failed, might need retry
      }
      return false;
    });

    res.json(pending);
  } catch (error) {
    console.error('Error listing pending automation:', error);
    res.status(500).json({ error: 'Failed to list pending automation tasks' });
  }
});

// GET /api/automation/running - List currently running automation tasks
router.get('/running', async (_req, res) => {
  try {
    const tasks = await taskService.listTasks();
    
    const running = tasks.filter(task => 
      task.type === 'automation' && 
      task.attempt?.agent === 'veritas' && 
      task.attempt?.status === 'running'
    );

    res.json(running);
  } catch (error) {
    console.error('Error listing running automation:', error);
    res.status(500).json({ error: 'Failed to list running automation tasks' });
  }
});

export { router as automationRoutes };
