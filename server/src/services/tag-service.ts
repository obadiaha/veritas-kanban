import { resolve } from 'path';
import type { TagConfig } from '@veritas-kanban/shared';
import { ManagedListService } from './managed-list-service.js';
import { TaskService } from './task-service.js';

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-amber-500/20 text-amber-400',
  'bg-red-500/20 text-red-400',
  'bg-cyan-500/20 text-cyan-400',
  'bg-pink-500/20 text-pink-400',
  'bg-orange-500/20 text-orange-400',
  'bg-indigo-500/20 text-indigo-400',
  'bg-emerald-500/20 text-emerald-400',
];

export class TagService extends ManagedListService<TagConfig> {
  private taskService: TaskService;
  private seeded = false;

  constructor(taskService: TaskService) {
    const configDir = resolve(process.cwd(), '..', '.veritas-kanban');
    
    super({
      filename: 'tags.json',
      configDir,
      defaults: [],
      referenceCounter: async (tagId: string) => {
        // Count how many tasks use this tag
        const tasks = await taskService.listTasks();
        return tasks.filter((task: any) => task.tags?.includes(tagId)).length;
      },
    });

    this.taskService = taskService;
  }

  /**
   * Initialize and seed tags from existing tasks if first run
   */
  async init(): Promise<void> {
    // Prevent re-entrant init (list() calls init(), seed calls list())
    if (this.seeded) return;
    this.seeded = true;

    await super.init();
    
    // Seed from existing tasks if no tags exist yet
    const existing = await this.list(true);
    if (existing.length === 0) {
      await this.seedFromExistingTasks();
    }
  }

  /**
   * Seed migration: Scan all existing tasks and create TagConfig entries
   * for unique tag strings found
   */
  private async seedFromExistingTasks(): Promise<void> {
    try {
      const tasks = await this.taskService.listTasks();
      const uniqueTags = new Set<string>();

      // Collect all unique tag strings from tasks
      tasks.forEach((task: any) => {
        if (task.tags && Array.isArray(task.tags)) {
          task.tags.forEach((tag: string) => uniqueTags.add(tag));
        }
      });

      // Create TagConfig entries for each unique tag
      const tagArray = Array.from(uniqueTags).sort();
      
      const now = new Date().toISOString();
      for (let i = 0; i < tagArray.length; i++) {
        const tagString = tagArray[i];
        const color = TAG_COLORS[i % TAG_COLORS.length];
        
        await this.seedItem({
          id: tagString,  // Must match existing task.tags values
          label: tagString,
          color,
          order: i,
          created: now,
          updated: now,
        } as TagConfig);
      }

      console.log(`Seeded ${tagArray.length} tags from existing tasks`);
    } catch (err) {
      console.error('Error seeding tags from existing tasks:', err);
    }
  }

  /**
   * Override create to use the label as the ID for backward compatibility
   */
  async create(input: Omit<TagConfig, 'id' | 'order' | 'created' | 'updated'>): Promise<TagConfig> {
    await this.init();
    
    const now = new Date().toISOString();
    const id = (input as any).label; // Use label as ID for backward compatibility
    
    // Check if tag with this label already exists
    const existing = await this.get(id);
    if (existing) {
      return existing;
    }
    
    // Calculate order as max + 1
    const items = await this.list(true);
    const maxOrder = items.length > 0 
      ? Math.max(...items.map(item => item.order))
      : -1;
    
    const newItem: TagConfig = {
      ...input,
      id,
      order: maxOrder + 1,
      created: now,
      updated: now,
    } as TagConfig;
    
    // Access private items array through any
    (this as any).items.push(newItem);
    await (this as any).save();
    
    return newItem;
  }
}
