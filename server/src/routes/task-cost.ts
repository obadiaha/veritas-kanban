import { Router, type Router as RouterType } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate, type ValidatedRequest } from '../middleware/validate.js';
import { getTaskService } from '../services/task-service.js';
import { getTelemetryService } from '../services/telemetry-service.js';
import { calculateCost, type CostEstimate, type CostAccuracy } from '@veritas-kanban/shared';
import type { TokenTelemetryEvent } from '@veritas-kanban/shared';
import {
  CostEstimateSchema,
  TaskCostParamsSchema,
  type CostEstimateInput,
  type TaskCostParams,
} from '../schemas/cost-schemas.js';
import { AppError } from '../middleware/error-handler.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('task-cost');
const router: RouterType = Router();

/**
 * POST /api/tasks/:id/estimate
 * Submit a cost estimate for a task
 */
router.post(
  '/:id/estimate',
  validate({ params: TaskCostParamsSchema, body: CostEstimateSchema }),
  asyncHandler(async (req: ValidatedRequest<TaskCostParams, unknown, CostEstimateInput>, res) => {
    const { id } = req.validated.params!;
    const estimateInput = req.validated.body!;

    const taskService = getTaskService();
    const task = await taskService.getTask(id);

    if (!task) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }

    // Build the cost estimate with timestamp
    const costEstimate: CostEstimate = {
      ...estimateInput,
      estimatedAt: new Date().toISOString(),
    };

    // Update the task with the cost estimate
    const updatedTask = await taskService.updateTask(id, { costEstimate });

    log.info(`Cost estimate added to task ${id}`);

    res.json({
      success: true,
      data: updatedTask,
    });
  })
);

/**
 * GET /api/tasks/:id/accuracy
 * Get cost accuracy for a completed task
 */
router.get(
  '/:id/accuracy',
  validate({ params: TaskCostParamsSchema }),
  asyncHandler(async (req: ValidatedRequest<TaskCostParams>, res) => {
    const { id } = req.validated.params!;

    const taskService = getTaskService();
    const task = await taskService.getTask(id);

    if (!task) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }

    if (!task.costAccuracy) {
      throw new AppError(404, 'Cost accuracy not yet computed', 'ACCURACY_NOT_COMPUTED');
    }

    res.json({
      success: true,
      data: task.costAccuracy,
    });
  })
);

/**
 * POST /api/tasks/:id/accuracy/compute
 * Manually trigger cost accuracy computation for a task
 */
router.post(
  '/:id/accuracy/compute',
  validate({ params: TaskCostParamsSchema }),
  asyncHandler(async (req: ValidatedRequest<TaskCostParams>, res) => {
    const { id } = req.validated.params!;

    const taskService = getTaskService();
    const task = await taskService.getTask(id);

    if (!task) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }

    if (!task.costEstimate) {
      throw new AppError(400, 'Task has no cost estimate', 'NO_ESTIMATE');
    }

    // Compute accuracy
    const accuracy = await computeCostAccuracy(id, task.costEstimate);

    // Update the task
    const updatedTask = await taskService.updateTask(id, { costAccuracy: accuracy });

    log.info(`Cost accuracy computed for task ${id}`);

    res.json({
      success: true,
      data: accuracy,
    });
  })
);

/**
 * GET /api/tasks/:id/usage
 * Get token usage summary for a specific task
 */
router.get(
  '/:id/usage',
  validate({ params: TaskCostParamsSchema }),
  asyncHandler(async (req: ValidatedRequest<TaskCostParams>, res) => {
    const { id } = req.validated.params!;

    const taskService = getTaskService();
    const task = await taskService.getTask(id);

    if (!task) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }

    const telemetryService = getTelemetryService();
    const events = await telemetryService.getEvents({
      type: 'run.tokens',
      taskId: id,
    });

    // Aggregate usage
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheTokens = 0;
    let totalCost = 0;
    const byModel: Record<string, { tokens: number; cost: number; runs: number }> = {};

    for (const event of events) {
      const tokenEvent = event as TokenTelemetryEvent;
      const eventTokens =
        tokenEvent.totalTokens ?? tokenEvent.inputTokens + tokenEvent.outputTokens;

      totalTokens += eventTokens;
      inputTokens += tokenEvent.inputTokens;
      outputTokens += tokenEvent.outputTokens;
      cacheTokens += tokenEvent.cacheTokens ?? 0;

      const model = tokenEvent.model || 'unknown';
      const cost = calculateCost(
        model,
        tokenEvent.inputTokens,
        tokenEvent.outputTokens,
        tokenEvent.cacheTokens
      );
      totalCost += cost;

      if (!byModel[model]) {
        byModel[model] = { tokens: 0, cost: 0, runs: 0 };
      }
      byModel[model].tokens += eventTokens;
      byModel[model].cost += cost;
      byModel[model].runs += 1;
    }

    res.json({
      success: true,
      data: {
        taskId: id,
        totalTokens,
        inputTokens,
        outputTokens,
        cacheTokens,
        totalCost: Math.round(totalCost * 10000) / 10000,
        runs: events.length,
        byModel,
      },
    });
  })
);

/**
 * Helper function to compute cost accuracy
 */
export async function computeCostAccuracy(
  taskId: string,
  estimate: CostEstimate
): Promise<CostAccuracy> {
  const telemetryService = getTelemetryService();
  const events = await telemetryService.getEvents({
    type: 'run.tokens',
    taskId,
  });

  let actualTokens = 0;
  let actualInputTokens = 0;
  let actualOutputTokens = 0;
  let actualCacheTokens = 0;
  let actualCost = 0;

  for (const event of events) {
    const tokenEvent = event as TokenTelemetryEvent;
    const eventTokens = tokenEvent.totalTokens ?? tokenEvent.inputTokens + tokenEvent.outputTokens;

    actualTokens += eventTokens;
    actualInputTokens += tokenEvent.inputTokens;
    actualOutputTokens += tokenEvent.outputTokens;
    actualCacheTokens += tokenEvent.cacheTokens ?? 0;

    const model = tokenEvent.model || 'unknown';
    const cost = calculateCost(
      model,
      tokenEvent.inputTokens,
      tokenEvent.outputTokens,
      tokenEvent.cacheTokens
    );
    actualCost += cost;
  }

  // Calculate accuracy (0-1 scale)
  const costAccuracy =
    estimate.estimatedCost > 0
      ? 1 - Math.abs(actualCost - estimate.estimatedCost) / estimate.estimatedCost
      : 0;

  const accuracy: CostAccuracy = {
    estimatedCost: estimate.estimatedCost,
    actualCost: Math.round(actualCost * 10000) / 10000,
    estimatedTokens: estimate.estimatedTokens,
    actualTokens,
    accuracy: Math.max(0, Math.min(1, costAccuracy)), // Clamp to [0, 1]
    costDelta: Math.round((actualCost - estimate.estimatedCost) * 10000) / 10000,
    tokenDelta: actualTokens - estimate.estimatedTokens,
    computedAt: new Date().toISOString(),
  };

  return accuracy;
}

export { router as taskCostRoutes };
