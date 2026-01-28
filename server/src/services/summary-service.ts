/**
 * Summary Service
 * 
 * Handles task aggregation and summary generation logic.
 * Extracted from summary.ts route to separate business logic from HTTP concerns.
 */

import type { Task } from '@veritas-kanban/shared';

export interface StatusCounts {
  todo: number;
  'in-progress': number;
  blocked: number;
  done: number;
}

export interface ProjectStats {
  total: number;
  done: number;
  inProgress: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  project?: string;
}

export interface OverallSummary {
  total: number;
  byStatus: StatusCounts;
  byProject: Record<string, ProjectStats>;
  highPriority: TaskSummary[];
}

export interface RecentActivity {
  completed: {
    id: string;
    title: string;
    project?: string;
    priority: string;
    completedAt: string;
    automation?: Task['automation'];
  }[];
  highPriorityActive: {
    id: string;
    title: string;
    status: string;
    project?: string;
  }[];
  period: {
    hours: number;
    since: string;
  };
}

export interface ProjectProgress {
  name: string;
  total: number;
  done: number;
  percent: number;
}

export class SummaryService {
  // ============ Aggregation Logic ============

  /**
   * Get overall task summary with status counts, project breakdown, and high-priority items
   */
  getOverallSummary(tasks: Task[]): OverallSummary {
    const byStatus: StatusCounts = {
      todo: tasks.filter(t => t.status === 'todo').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      done: tasks.filter(t => t.status === 'done').length,
    };
    
    const byProject: Record<string, ProjectStats> = {};
    tasks.forEach(task => {
      const project = task.project || 'unassigned';
      if (!byProject[project]) {
        byProject[project] = { total: 0, done: 0, inProgress: 0 };
      }
      byProject[project].total++;
      if (task.status === 'done') byProject[project].done++;
      if (task.status === 'in-progress') byProject[project].inProgress++;
    });
    
    const highPriority = tasks
      .filter(t => t.priority === 'high' && t.status !== 'done')
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        project: t.project,
      }));
    
    return {
      total: tasks.length,
      byStatus,
      byProject,
      highPriority,
    };
  }

  /**
   * Get recently completed and active high-priority tasks
   */
  getRecentActivity(tasks: Task[], hours: number = 24): RecentActivity {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Find tasks completed recently (status=done and updated within timeframe)
    const completed = tasks
      .filter(task => {
        if (task.status !== 'done') return false;
        const updated = new Date(task.updated);
        return updated >= cutoff;
      })
      .map(t => ({
        id: t.id,
        title: t.title,
        project: t.project,
        priority: t.priority,
        completedAt: t.updated,
        automation: t.automation,
      }));
    
    // High-priority tasks that moved to in-progress or review
    const highPriorityActive = tasks
      .filter(task => {
        if (task.priority !== 'high') return false;
        if (task.status === 'todo' || task.status === 'done') return false;
        const updated = new Date(task.updated);
        return updated >= cutoff;
      })
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        project: t.project,
      }));
    
    return {
      completed,
      highPriorityActive,
      period: {
        hours,
        since: cutoff.toISOString(),
      },
    };
  }

  /**
   * Get project progress statistics
   */
  getProjectProgress(tasks: Task[]): ProjectProgress[] {
    const byProject: Record<string, { total: number; done: number }> = {};
    
    tasks.forEach(task => {
      const project = task.project || 'unassigned';
      if (!byProject[project]) {
        byProject[project] = { total: 0, done: 0 };
      }
      byProject[project].total++;
      if (task.status === 'done') byProject[project].done++;
    });
    
    return Object.entries(byProject)
      .filter(([_, stats]) => stats.total > 1)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        done: stats.done,
        percent: Math.round((stats.done / stats.total) * 100),
      }));
  }

  // ============ Memory Formatting ============

  /**
   * Generate markdown summary for memory file sync
   */
  generateMemoryMarkdown(tasks: Task[], hours: number = 24): string {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Completed tasks
    const completed = tasks.filter(task => {
      if (task.status !== 'done') return false;
      const updated = new Date(task.updated);
      return updated >= cutoff;
    });
    
    // Active high-priority
    const highPriority = tasks.filter(t => 
      t.priority === 'high' && 
      (t.status === 'in-progress' || t.status === 'blocked')
    );
    
    // Build markdown
    let markdown = '';
    
    if (completed.length > 0) {
      markdown += '### Veritas Kanban - Completed Tasks\n\n';
      completed.forEach(task => {
        const projectTag = task.project ? ` (${task.project})` : '';
        const priorityTag = task.priority === 'high' ? ' 🔴' : '';
        markdown += `- ✅ ${task.title}${projectTag}${priorityTag}\n`;
        if (task.automation?.result) {
          markdown += `  - Result: ${task.automation.result}\n`;
        }
      });
      markdown += '\n';
    }
    
    if (highPriority.length > 0) {
      markdown += '### Active High-Priority Tasks\n\n';
      highPriority.forEach(task => {
        const projectTag = task.project ? ` (${task.project})` : '';
        const statusIcon = task.status === 'in-progress' ? '🔄' : '👀';
        markdown += `- ${statusIcon} ${task.title}${projectTag} [${task.status}]\n`;
      });
      markdown += '\n';
    }
    
    // Project progress
    const projectProgress = this.getProjectProgress(tasks);
    
    if (projectProgress.length > 0) {
      markdown += '### Project Progress\n\n';
      projectProgress.forEach(p => {
        markdown += `- **${p.name}**: ${p.done}/${p.total} (${p.percent}%)\n`;
      });
    }
    
    return markdown || 'No recent kanban activity.\n';
  }
}

// Singleton instance
let instance: SummaryService | null = null;

export function getSummaryService(): SummaryService {
  if (!instance) {
    instance = new SummaryService();
  }
  return instance;
}
