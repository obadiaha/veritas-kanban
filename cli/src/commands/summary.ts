import { Command } from 'commander';
import chalk from 'chalk';
import { api, API_BASE } from '../utils/api.js';

export function registerSummaryCommands(program: Command): void {
  // Show summary
  program
    .command('summary')
    .description('Show task summary')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const summary = await api<{
          total: number;
          byStatus: Record<string, number>;
          byProject: Record<string, { total: number; done: number; inProgress: number }>;
          highPriority: { id: string; title: string; status: string; project?: string }[];
        }>('/api/summary');
        
        if (options.json) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log(chalk.bold('\n📊 Veritas Kanban Summary\n'));
          
          console.log(chalk.dim('Status:'));
          console.log(`  To Do:       ${summary.byStatus.todo}`);
          console.log(`  In Progress: ${summary.byStatus['in-progress']}`);
          console.log(`  Review:      ${summary.byStatus.review}`);
          console.log(`  Done:        ${summary.byStatus.done}`);
          
          const projects = Object.entries(summary.byProject);
          if (projects.length > 0) {
            console.log(chalk.dim('\nProjects:'));
            projects.forEach(([name, stats]) => {
              const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
              console.log(`  ${name}: ${stats.done}/${stats.total} (${percent}%)`);
            });
          }
          
          if (summary.highPriority.length > 0) {
            console.log(chalk.red('\n🔴 High Priority:'));
            summary.highPriority.forEach(t => {
              console.log(`  ${t.title} [${t.status}]${t.project ? ` #${t.project}` : ''}`);
            });
          }
          
          console.log();
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // Get memory-formatted summary
  program
    .command('memory')
    .description('Get task summary formatted for memory files')
    .option('-h, --hours <n>', 'Hours to look back', '24')
    .option('-o, --output <file>', 'Append to file instead of stdout')
    .option('--json', 'Output recent tasks as JSON instead')
    .action(async (options) => {
      try {
        if (options.json) {
          const recent = await api<unknown>(`/api/summary/recent?hours=${options.hours}`);
          console.log(JSON.stringify(recent, null, 2));
        } else {
          const res = await fetch(`${API_BASE}/api/summary/memory?hours=${options.hours}`);
          const markdown = await res.text();
          
          if (options.output) {
            const fs = await import('fs/promises');
            const path = await import('path');
            
            // Expand ~ to home dir
            let outputPath = options.output;
            if (outputPath.startsWith('~')) {
              outputPath = path.join(process.env.HOME || '', outputPath.slice(1));
            }
            
            // Append to file
            await fs.appendFile(outputPath, '\n' + markdown);
            console.log(chalk.green(`✓ Appended to ${outputPath}`));
          } else {
            console.log(markdown);
          }
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
