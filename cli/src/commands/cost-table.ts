import { Command } from 'commander';
import { apiClient } from '../lib/api-client.js';
import chalk from 'chalk';
import type { ModelPricing } from '@veritas-kanban/shared';

export function registerCostTableCommands(program: Command): void {
  program
    .command('cost-table')
    .description('Show model pricing table')
    .option('--update', 'Refresh pricing from API')
    .action(async (options) => {
      try {
        await showCostTable(options.update);
      } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

/**
 * Show model pricing table
 */
async function showCostTable(refresh: boolean): Promise<void> {
  const response = await apiClient.get<Record<string, ModelPricing>>('/models/costs');
  const costs = response.data;

  console.log(chalk.bold('\n💰 Model Pricing Table'));
  if (refresh) {
    console.log(chalk.green('✓ Refreshed from API'));
  }
  console.log(chalk.dim('─'.repeat(80)));

  console.log(
    `${chalk.bold('Model'.padEnd(35))} ${chalk.bold('Input/1M'.padEnd(15))} ${chalk.bold('Output/1M'.padEnd(15))} ${chalk.bold('Cache/1M')}`
  );
  console.log(chalk.dim('─'.repeat(80)));

  const models = Object.entries(costs).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [model, pricing] of models) {
    const inputCost = chalk.cyan(`$${pricing.inputPer1M.toFixed(2)}`).padEnd(22);
    const outputCost = chalk.green(`$${pricing.outputPer1M.toFixed(2)}`).padEnd(22);
    const cacheCost = pricing.cachePer1M
      ? chalk.yellow(`$${pricing.cachePer1M.toFixed(2)}`)
      : chalk.dim('—');

    console.log(`${model.padEnd(35)} ${inputCost} ${outputCost} ${cacheCost}`);
  }

  console.log(chalk.dim('─'.repeat(80)));
  console.log(chalk.dim('\nPrices shown per 1 million tokens'));
  console.log();
}
