import { Command } from 'commander';
import { apiClient } from '../lib/api-client.js';
import chalk from 'chalk';
import type { CostMetrics, ModelCostBreakdown } from '@veritas-kanban/shared';

export function registerUsageCommands(program: Command): void {
  const usage = program
    .command('usage')
    .description('Show token and cost usage metrics')
    .option('-w, --week', 'Show this week instead of today')
    .option('-t, --task <id>', 'Show usage for a specific task')
    .option('-m, --model <name>', 'Filter by model')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        if (options.task) {
          await showTaskUsage(options.task, options.json);
        } else if (options.model) {
          await showModelUsage(options.model, options.week, options.json);
        } else {
          await showOverallUsage(options.week, options.json);
        }
      } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

/**
 * Show overall usage for today or this week
 */
async function showOverallUsage(week: boolean, json: boolean): Promise<void> {
  const period = week ? '7d' : '24h';
  const response = await apiClient.get<CostMetrics>(`/metrics/cost?period=${period}`);
  const metrics = response.data;

  if (json) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  const periodLabel = week ? 'This Week' : 'Today';
  console.log(chalk.bold(`\n📊 Usage Summary — ${periodLabel}`));
  console.log(chalk.dim('─'.repeat(50)));

  console.log(`Total Tokens:     ${chalk.cyan(metrics.totalTokens.toLocaleString())}`);
  console.log(`  Input:          ${chalk.dim(metrics.inputTokens.toLocaleString())}`);
  console.log(`  Output:         ${chalk.dim(metrics.outputTokens.toLocaleString())}`);
  if (metrics.cacheTokens > 0) {
    console.log(`  Cache:          ${chalk.dim(metrics.cacheTokens.toLocaleString())}`);
  }

  console.log(`\nTotal Cost:       ${chalk.green('$' + metrics.totalCost.toFixed(4))}`);
  console.log(`Runs:             ${chalk.dim(metrics.runs)}`);
  console.log(`Avg Cost/Run:     ${chalk.dim('$' + metrics.averageCostPerRun.toFixed(4))}`);

  // Fetch by-model breakdown
  const breakdownResponse = await apiClient.get<ModelCostBreakdown[]>(
    `/metrics/cost/by-model?period=${period}`
  );
  const breakdown = breakdownResponse.data;

  if (breakdown.length > 0) {
    console.log(chalk.bold('\n📈 By Model'));
    console.log(chalk.dim('─'.repeat(50)));

    for (const model of breakdown) {
      console.log(
        `${chalk.cyan(model.model.padEnd(30))} ${chalk.green('$' + model.totalCost.toFixed(4))} ${chalk.dim(`(${model.runs} runs)`)}`
      );
    }
  }

  console.log();
}

/**
 * Show usage for a specific task
 */
async function showTaskUsage(taskId: string, json: boolean): Promise<void> {
  const response = await apiClient.get<{
    taskId: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
    totalCost: number;
    runs: number;
    byModel: Record<string, { tokens: number; cost: number; runs: number }>;
  }>(`/tasks/${taskId}/usage`);

  const usage = response.data;

  if (json) {
    console.log(JSON.stringify(usage, null, 2));
    return;
  }

  console.log(chalk.bold(`\n📊 Task Usage — ${taskId}`));
  console.log(chalk.dim('─'.repeat(50)));

  console.log(`Total Tokens:     ${chalk.cyan(usage.totalTokens.toLocaleString())}`);
  console.log(`  Input:          ${chalk.dim(usage.inputTokens.toLocaleString())}`);
  console.log(`  Output:         ${chalk.dim(usage.outputTokens.toLocaleString())}`);
  if (usage.cacheTokens > 0) {
    console.log(`  Cache:          ${chalk.dim(usage.cacheTokens.toLocaleString())}`);
  }

  console.log(`\nTotal Cost:       ${chalk.green('$' + usage.totalCost.toFixed(4))}`);
  console.log(`Runs:             ${chalk.dim(usage.runs)}`);

  const models = Object.entries(usage.byModel);
  if (models.length > 0) {
    console.log(chalk.bold('\n📈 By Model'));
    console.log(chalk.dim('─'.repeat(50)));

    for (const [model, data] of models) {
      console.log(
        `${chalk.cyan(model.padEnd(30))} ${chalk.green('$' + data.cost.toFixed(4))} ${chalk.dim(`(${data.runs} runs)`)}`
      );
    }
  }

  console.log();
}

/**
 * Show usage filtered by model
 */
async function showModelUsage(modelName: string, week: boolean, json: boolean): Promise<void> {
  const period = week ? '7d' : '24h';
  const breakdownResponse = await apiClient.get<ModelCostBreakdown[]>(
    `/metrics/cost/by-model?period=${period}`
  );
  const breakdown = breakdownResponse.data;

  const modelData = breakdown.find((m) => m.model.includes(modelName));

  if (!modelData) {
    console.error(chalk.red(`Model "${modelName}" not found in usage data`));
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify(modelData, null, 2));
    return;
  }

  const periodLabel = week ? 'This Week' : 'Today';
  console.log(chalk.bold(`\n📊 Model Usage — ${modelData.model} (${periodLabel})`));
  console.log(chalk.dim('─'.repeat(50)));

  console.log(`Total Tokens:     ${chalk.cyan(modelData.totalTokens.toLocaleString())}`);
  console.log(`  Input:          ${chalk.dim(modelData.inputTokens.toLocaleString())}`);
  console.log(`  Output:         ${chalk.dim(modelData.outputTokens.toLocaleString())}`);
  if (modelData.cacheTokens > 0) {
    console.log(`  Cache:          ${chalk.dim(modelData.cacheTokens.toLocaleString())}`);
  }

  console.log(`\nTotal Cost:       ${chalk.green('$' + modelData.totalCost.toFixed(4))}`);
  console.log(`Runs:             ${chalk.dim(modelData.runs)}`);
  console.log(`Avg Cost/Run:     ${chalk.dim('$' + modelData.averageCostPerRun.toFixed(4))}`);

  console.log();
}
