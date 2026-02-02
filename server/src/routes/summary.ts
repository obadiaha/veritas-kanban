import { Router, type Router as RouterType } from 'express';
import { getTaskService } from '../services/task-service.js';
import { getSummaryService } from '../services/summary-service.js';
import { activityService } from '../services/activity-service.js';
import { getMetricsService } from '../services/metrics/index.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router: RouterType = Router();
const taskService = getTaskService();
const summaryService = getSummaryService();

// GET /api/summary - Get overall task summary
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const tasks = await taskService.listTasks();
    const summary = summaryService.getOverallSummary(tasks);
    res.json(summary);
  })
);

// GET /api/summary/recent - Get recently completed tasks (for memory sync)
router.get(
  '/recent',
  asyncHandler(async (req, res) => {
    const hours = parseInt(req.query.hours as string) || 24;
    const tasks = await taskService.listTasks();
    const recentActivity = summaryService.getRecentActivity(tasks, hours);
    res.json(recentActivity);
  })
);

// GET /api/summary/memory - Get formatted summary for memory file
router.get(
  '/memory',
  asyncHandler(async (req, res) => {
    const hours = parseInt(req.query.hours as string) || 24;
    const tasks = await taskService.listTasks();
    const markdown = summaryService.generateMemoryMarkdown(tasks, hours);
    res.type('text/markdown').send(markdown);
  })
);

// GET /api/summary/standup - Get daily standup report
router.get(
  '/standup',
  asyncHandler(async (req, res) => {
    const dateParam = req.query.date as string | undefined;
    const format = (req.query.format as string) || 'json';

    // Parse target date (defaults to today)
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam + 'T00:00:00');
      if (isNaN(targetDate.getTime())) {
        res.status(400).json({
          error: 'Invalid date format. Use YYYY-MM-DD.',
        });
        return;
      }
    } else {
      targetDate = new Date();
    }

    const tasks = await taskService.listTasks();
    // Fetch enough activities to cover the target date
    const activities = await activityService.getActivities(500);

    const standupData = summaryService.getStandupData(tasks, activities, targetDate);

    // Enhance with cost metrics (24h period for the target date)
    const metricsService = getMetricsService();
    const costMetrics = await metricsService.getCostMetrics('24h');
    const modelBreakdown = await metricsService.getModelCostBreakdown('24h');
    const accuracyMetrics = await metricsService.getAccuracyMetrics();

    // Find most/least expensive completed tasks
    const completedTaskIds = standupData.completed.map((t) => t.id);
    let mostExpensive: { id: string; title: string; cost: number } | undefined;
    let leastExpensive: { id: string; title: string; cost: number } | undefined;

    for (const task of tasks) {
      if (completedTaskIds.includes(task.id) && task.costAccuracy) {
        const cost = task.costAccuracy.actualCost;
        if (!mostExpensive || cost > mostExpensive.cost) {
          mostExpensive = { id: task.id, title: task.title, cost };
        }
        if (!leastExpensive || cost < leastExpensive.cost) {
          leastExpensive = { id: task.id, title: task.title, cost };
        }
      }
    }

    // Add cost metrics to stats
    standupData.stats.totalTokens = costMetrics.totalTokens;
    standupData.stats.totalCost = costMetrics.totalCost;
    standupData.stats.modelBreakdown = modelBreakdown.slice(0, 5).map((m) => ({
      model: m.model,
      cost: m.totalCost,
      tokens: m.totalTokens,
    }));
    standupData.stats.mostExpensiveTask = mostExpensive;
    standupData.stats.leastExpensiveTask = leastExpensive;
    standupData.stats.predictionAccuracy =
      accuracyMetrics.totalPredictions > 0 ? accuracyMetrics.averageAccuracy : undefined;

    switch (format) {
      case 'markdown':
        res.type('text/markdown').send(summaryService.generateStandupMarkdown(standupData));
        break;
      case 'text':
        res.type('text/plain').send(summaryService.generateStandupText(standupData));
        break;
      case 'json':
      default:
        res.json(standupData);
        break;
    }
  })
);

export { router as summaryRoutes };
