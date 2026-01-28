import { resolve } from 'path';
import { existsSync } from 'fs';
import type { ProjectConfig } from '@veritas-kanban/shared';
import { ManagedListService } from './managed-list-service.js';
import { TaskService } from './task-service.js';

// Color palette for auto-seeded projects
const PROJECT_COLORS = [
  'bg-blue-500/20',
  'bg-green-500/20',
  'bg-purple-500/20',
  'bg-orange-500/20',
  'bg-pink-500/20',
  'bg-cyan-500/20',
  'bg-amber-500/20',
  'bg-rose-500/20',
  'bg-indigo-500/20',
  'bg-teal-500/20',
];

export class ProjectService extends ManagedListService<ProjectConfig> {
  private taskService: TaskService;
  private seeded = false;

  constructor(taskService: TaskService) {
    const configDir = resolve(process.cwd(), '..', '.veritas-kanban');
    
    super({
      filename: 'projects.json',
      configDir,
      defaults: [],
      referenceCounter: async (projectId: string) => {
        // Count how many tasks use this project
        const tasks = await taskService.listTasks();
        return tasks.filter((task: any) => task.project === projectId).length;
      },
    });

    this.taskService = taskService;
  }

  /**
   * Initialize service and perform seed migration if needed
   */
  async init(): Promise<void> {
    // Call parent init first
    await super.init();

    // Seed projects from existing tasks on first run
    if (!this.seeded) {
      await this.seedProjectsFromTasks();
      this.seeded = true;
    }
  }

  /**
   * Seed migration: scan all tasks and create ProjectConfig entries for unique projects
   */
  private async seedProjectsFromTasks(): Promise<void> {
    const configDir = resolve(process.cwd(), '..', '.veritas-kanban');
    const projectsFile = resolve(configDir, 'projects.json');
    
    // Only seed if the file is empty or has no items
    const existingProjects = await this.list(true);
    if (existingProjects.length > 0) {
      return; // Already seeded
    }

    // Collect unique project strings from all tasks (active + archived)
    const [activeTasks, archivedTasks] = await Promise.all([
      this.taskService.listTasks(),
      this.taskService.listArchivedTasks(),
    ]);

    const allTasks = [...activeTasks, ...archivedTasks];
    const projectStrings = new Set<string>();

    allTasks.forEach(task => {
      if (task.project) {
        projectStrings.add(task.project);
      }
    });

    // Create ProjectConfig entries for each unique project
    const projectArray = Array.from(projectStrings).sort();
    
    for (let i = 0; i < projectArray.length; i++) {
      const projectName = projectArray[i];
      const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
      
      // Create the project using the project name as both id and label
      const now = new Date().toISOString();
      await this.create({
        label: projectName,
        color,
        order: i,
        created: now,
        updated: now,
      } as any);
    }

    console.log(`✅ Seeded ${projectArray.length} projects from existing tasks`);
  }
}
