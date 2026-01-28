import { Router, type Router as RouterType } from 'express';
import { ClawdbotAgentService, clawdbotAgentService } from '../services/clawdbot-agent-service.js';
import { getTelemetryService } from '../services/telemetry-service.js';
import type { AgentType, TokenTelemetryEvent } from '@veritas-kanban/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { NotFoundError, ValidationError } from '../middleware/error-handler.js';

const router: RouterType = Router();

// POST /api/agents/:taskId/start - Start agent on task (delegates to Clawdbot)
router.post('/:taskId/start', asyncHandler(async (req, res) => {
  const { agent } = req.body as { agent?: AgentType };
  const status = await clawdbotAgentService.startAgent((req.params.taskId as string), agent);
  res.status(201).json(status);
}));

// POST /api/agents/:taskId/complete - Callback from Clawdbot when agent finishes
router.post('/:taskId/complete', asyncHandler(async (req, res) => {
  const { success, summary, error } = req.body as { 
    success: boolean; 
    summary?: string; 
    error?: string;
  };
  
  await clawdbotAgentService.completeAgent((req.params.taskId as string), { success, summary, error });
  res.json({ received: true });
}));

// POST /api/agents/:taskId/stop - Stop running agent
router.post('/:taskId/stop', asyncHandler(async (req, res) => {
  await clawdbotAgentService.stopAgent(req.params.taskId as string);
  res.json({ stopped: true });
}));

// GET /api/agents/:taskId/status - Get agent status
router.get('/:taskId/status', asyncHandler(async (req, res) => {
  const status = clawdbotAgentService.getAgentStatus(req.params.taskId as string);
  if (!status) {
    return res.json({ running: false });
  }
  res.json({ running: true, ...status });
}));

// GET /api/agents/pending - List pending agent requests (for Veritas to poll)
router.get('/pending', asyncHandler(async (_req, res) => {
  const requests = await clawdbotAgentService.listPendingRequests();
  res.json(requests);
}));

// GET /api/agents/:taskId/attempts - List attempts for task
router.get('/:taskId/attempts', asyncHandler(async (req, res) => {
  const attempts = await clawdbotAgentService.listAttempts(req.params.taskId as string);
  res.json(attempts);
}));

// GET /api/agents/:taskId/attempts/:attemptId/log - Get attempt log
router.get('/:taskId/attempts/:attemptId/log', asyncHandler(async (req, res) => {
  const log = await clawdbotAgentService.getAttemptLog((req.params.taskId as string), (req.params.attemptId as string));
  res.type('text/markdown').send(log);
}));

// POST /api/agents/:taskId/tokens - Report token usage for a run
router.post('/:taskId/tokens', asyncHandler(async (req, res) => {
  const { attemptId, inputTokens, outputTokens, totalTokens, model, agent } = req.body as {
    attemptId?: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
    model?: string;
    agent?: AgentType;
  };

  // Validate required fields
  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
    throw new ValidationError('inputTokens and outputTokens are required numbers');
  }

  const taskId = req.params.taskId as string;
  
  // Get task to find project and current attempt
  const { TaskService } = await import('../services/task-service.js');
  const taskService = new TaskService();
  const task = await taskService.getTask(taskId);
  
  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Use provided attemptId or current attempt
  const resolvedAttemptId = attemptId || task.attempt?.id || 'unknown';
  const resolvedAgent = agent || task.attempt?.agent || 'claude-code';

  // Emit telemetry event
  const telemetry = getTelemetryService();
  const event = await telemetry.emit<TokenTelemetryEvent>({
    type: 'run.tokens',
    taskId,
    attemptId: resolvedAttemptId,
    agent: resolvedAgent,
    project: task.project,
    inputTokens,
    outputTokens,
    totalTokens: totalTokens ?? (inputTokens + outputTokens),
    model,
  });

  res.status(201).json({
    recorded: true,
    eventId: event.id,
    totalTokens: event.totalTokens,
  });
}));

// Export service for WebSocket use
export { router as agentRoutes, clawdbotAgentService as agentService };
