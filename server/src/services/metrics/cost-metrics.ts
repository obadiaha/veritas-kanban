/**
 * Cost-related metrics: cost tracking and prediction accuracy.
 */
import type { TokenTelemetryEvent, AnyTelemetryEvent, Task } from '@veritas-kanban/shared';
import { calculateCost } from '@veritas-kanban/shared';
import { getPeriodStart } from './helpers.js';
import { getEventFiles, createLineReader } from './telemetry-reader.js';
import type { MetricsPeriod } from './types.js';
import { getTaskService } from '../task-service.js';
import { createLogger } from '../../lib/logger.js';
const log = createLogger('cost-metrics');

export interface CostMetrics {
  period: MetricsPeriod;
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  runs: number;
  averageCostPerRun: number;
}

export interface ModelCostBreakdown {
  model: string;
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  runs: number;
  averageCostPerRun: number;
}

export interface AccuracyMetrics {
  totalPredictions: number;
  averageAccuracy: number;
  byTaskType: Record<string, { count: number; avgAccuracy: number }>;
  byAgent: Record<string, { count: number; avgAccuracy: number }>;
  overBudgetCount: number;
  underBudgetCount: number;
  perfectCount: number; // accuracy > 0.9
}

/**
 * Get cost metrics with per-model pricing
 */
export async function computeCostMetrics(
  telemetryDir: string,
  period: MetricsPeriod,
  project?: string
): Promise<CostMetrics> {
  const since = getPeriodStart(period);
  const files = await getEventFiles(telemetryDir, since);

  let totalCost = 0;
  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheTokens = 0;
  let runs = 0;

  for (const filePath of files) {
    try {
      const rl = createLineReader(filePath);

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line) as AnyTelemetryEvent;

          if (event.type !== 'run.tokens') continue;
          if (event.timestamp < since) continue;
          if (project && event.project !== project) continue;

          const tokenEvent = event as TokenTelemetryEvent;
          const eventTokens =
            tokenEvent.totalTokens ?? tokenEvent.inputTokens + tokenEvent.outputTokens;

          totalTokens += eventTokens;
          inputTokens += tokenEvent.inputTokens;
          outputTokens += tokenEvent.outputTokens;
          cacheTokens += tokenEvent.cacheTokens ?? 0;
          runs++;

          const model = tokenEvent.model || 'unknown';
          const cost = calculateCost(
            model,
            tokenEvent.inputTokens,
            tokenEvent.outputTokens,
            tokenEvent.cacheTokens
          );
          totalCost += cost;
        } catch {
          continue;
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        log.error(`[Metrics] Error reading ${filePath}:`, error.message);
      }
    }
  }

  return {
    period,
    totalCost: Math.round(totalCost * 10000) / 10000,
    totalTokens,
    inputTokens,
    outputTokens,
    cacheTokens,
    runs,
    averageCostPerRun: runs > 0 ? Math.round((totalCost / runs) * 10000) / 10000 : 0,
  };
}

/**
 * Get cost breakdown by model
 */
export async function computeModelCostBreakdown(
  telemetryDir: string,
  period: MetricsPeriod,
  project?: string
): Promise<ModelCostBreakdown[]> {
  const since = getPeriodStart(period);
  const files = await getEventFiles(telemetryDir, since);

  const byModel = new Map<
    string,
    {
      cost: number;
      tokens: number;
      inputTokens: number;
      outputTokens: number;
      cacheTokens: number;
      runs: number;
    }
  >();

  for (const filePath of files) {
    try {
      const rl = createLineReader(filePath);

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line) as AnyTelemetryEvent;

          if (event.type !== 'run.tokens') continue;
          if (event.timestamp < since) continue;
          if (project && event.project !== project) continue;

          const tokenEvent = event as TokenTelemetryEvent;
          const model = tokenEvent.model || 'unknown';
          const eventTokens =
            tokenEvent.totalTokens ?? tokenEvent.inputTokens + tokenEvent.outputTokens;

          if (!byModel.has(model)) {
            byModel.set(model, {
              cost: 0,
              tokens: 0,
              inputTokens: 0,
              outputTokens: 0,
              cacheTokens: 0,
              runs: 0,
            });
          }

          const modelData = byModel.get(model)!;
          modelData.tokens += eventTokens;
          modelData.inputTokens += tokenEvent.inputTokens;
          modelData.outputTokens += tokenEvent.outputTokens;
          modelData.cacheTokens += tokenEvent.cacheTokens ?? 0;
          modelData.runs++;

          const cost = calculateCost(
            model,
            tokenEvent.inputTokens,
            tokenEvent.outputTokens,
            tokenEvent.cacheTokens
          );
          modelData.cost += cost;
        } catch {
          continue;
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        log.error(`[Metrics] Error reading ${filePath}:`, error.message);
      }
    }
  }

  // Convert to array and sort by cost descending
  const breakdown: ModelCostBreakdown[] = [];
  for (const [model, data] of byModel.entries()) {
    breakdown.push({
      model,
      totalCost: Math.round(data.cost * 10000) / 10000,
      totalTokens: data.tokens,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cacheTokens: data.cacheTokens,
      runs: data.runs,
      averageCostPerRun: data.runs > 0 ? Math.round((data.cost / data.runs) * 10000) / 10000 : 0,
    });
  }

  breakdown.sort((a, b) => b.totalCost - a.totalCost);

  return breakdown;
}

/**
 * Get global prediction accuracy metrics
 */
export async function computeAccuracyMetrics(): Promise<AccuracyMetrics> {
  const taskService = getTaskService();
  const allTasks = await taskService.listTasks();

  // Filter tasks that have both estimate and accuracy
  const tasksWithAccuracy = allTasks.filter((task: Task) => task.costEstimate && task.costAccuracy);

  if (tasksWithAccuracy.length === 0) {
    return {
      totalPredictions: 0,
      averageAccuracy: 0,
      byTaskType: {},
      byAgent: {},
      overBudgetCount: 0,
      underBudgetCount: 0,
      perfectCount: 0,
    };
  }

  let totalAccuracy = 0;
  let overBudgetCount = 0;
  let underBudgetCount = 0;
  let perfectCount = 0;

  const byTaskType = new Map<string, { totalAccuracy: number; count: number }>();
  const byAgent = new Map<string, { totalAccuracy: number; count: number }>();

  for (const task of tasksWithAccuracy) {
    const accuracy = task.costAccuracy!.accuracy;
    totalAccuracy += accuracy;

    // Perfect predictions (>90% accuracy)
    if (accuracy > 0.9) {
      perfectCount++;
    }

    // Over/under budget tracking
    if (task.costAccuracy!.costDelta > 0) {
      overBudgetCount++;
    } else if (task.costAccuracy!.costDelta < 0) {
      underBudgetCount++;
    }

    // By task type
    const taskType = task.type || 'unknown';
    if (!byTaskType.has(taskType)) {
      byTaskType.set(taskType, { totalAccuracy: 0, count: 0 });
    }
    const typeData = byTaskType.get(taskType)!;
    typeData.totalAccuracy += accuracy;
    typeData.count++;

    // By agent
    const agent = task.agent || 'unknown';
    if (!byAgent.has(agent)) {
      byAgent.set(agent, { totalAccuracy: 0, count: 0 });
    }
    const agentData = byAgent.get(agent)!;
    agentData.totalAccuracy += accuracy;
    agentData.count++;
  }

  // Convert maps to records
  const byTaskTypeRecord: Record<string, { count: number; avgAccuracy: number }> = {};
  for (const [type, data] of byTaskType.entries()) {
    byTaskTypeRecord[type] = {
      count: data.count,
      avgAccuracy: Math.round((data.totalAccuracy / data.count) * 1000) / 1000,
    };
  }

  const byAgentRecord: Record<string, { count: number; avgAccuracy: number }> = {};
  for (const [agent, data] of byAgent.entries()) {
    byAgentRecord[agent] = {
      count: data.count,
      avgAccuracy: Math.round((data.totalAccuracy / data.count) * 1000) / 1000,
    };
  }

  return {
    totalPredictions: tasksWithAccuracy.length,
    averageAccuracy: Math.round((totalAccuracy / tasksWithAccuracy.length) * 1000) / 1000,
    byTaskType: byTaskTypeRecord,
    byAgent: byAgentRecord,
    overBudgetCount,
    underBudgetCount,
    perfectCount,
  };
}
