import { Router, type Router as RouterType } from 'express';
import { TaskService } from '../services/task-service.js';

const router: RouterType = Router();
const taskService = new TaskService();

// GET /api/summary - Get overall task summary
router.get('/', async (_req, res) => {
  try {
    const tasks = await taskService.listTasks();
    
    const byStatus = {
      todo: tasks.filter(t => t.status === 'todo').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      done: tasks.filter(t => t.status === 'done').length,
    };
    
    const byProject: Record<string, { total: number; done: number; inProgress: number }> = {};
    tasks.forEach(task => {
      const project = task.project || 'unassigned';
      if (!byProject[project]) {
        byProject[project] = { total: 0, done: 0, inProgress: 0 };
      }
      byProject[project].total++;
      if (task.status === 'done') byProject[project].done++;
      if (task.status === 'in-progress') byProject[project].inProgress++;
    });
    
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'done');
    
    res.json({
      total: tasks.length,
      byStatus,
      byProject,
      highPriority: highPriority.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        project: t.project,
      })),
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// GET /api/summary/recent - Get recently completed tasks (for memory sync)
router.get('/recent', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const tasks = await taskService.listTasks();
    
    // Find tasks completed recently (status=done and updated within timeframe)
    const recent = tasks.filter(task => {
      if (task.status !== 'done') return false;
      const updated = new Date(task.updated);
      return updated >= cutoff;
    });
    
    // Also include high-priority tasks that moved to in-progress or review
    const highPriorityActive = tasks.filter(task => {
      if (task.priority !== 'high') return false;
      if (task.status === 'todo' || task.status === 'done') return false;
      const updated = new Date(task.updated);
      return updated >= cutoff;
    });
    
    res.json({
      completed: recent.map(t => ({
        id: t.id,
        title: t.title,
        project: t.project,
        priority: t.priority,
        completedAt: t.updated,
        automation: t.automation,
      })),
      highPriorityActive: highPriorityActive.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        project: t.project,
      })),
      period: {
        hours,
        since: cutoff.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting recent tasks:', error);
    res.status(500).json({ error: 'Failed to get recent tasks' });
  }
});

// GET /api/summary/memory - Get formatted summary for memory file
router.get('/memory', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const tasks = await taskService.listTasks();
    
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
    const byProject: Record<string, { total: number; done: number }> = {};
    tasks.forEach(task => {
      const project = task.project || 'unassigned';
      if (!byProject[project]) {
        byProject[project] = { total: 0, done: 0 };
      }
      byProject[project].total++;
      if (task.status === 'done') byProject[project].done++;
    });
    
    const projectsWithProgress = Object.entries(byProject)
      .filter(([_, stats]) => stats.total > 1)
      .map(([name, stats]) => ({ name, ...stats, percent: Math.round((stats.done / stats.total) * 100) }));
    
    if (projectsWithProgress.length > 0) {
      markdown += '### Project Progress\n\n';
      projectsWithProgress.forEach(p => {
        markdown += `- **${p.name}**: ${p.done}/${p.total} (${p.percent}%)\n`;
      });
    }
    
    res.type('text/markdown').send(markdown || 'No recent kanban activity.\n');
  } catch (error) {
    console.error('Error getting memory summary:', error);
    res.status(500).json({ error: 'Failed to get memory summary' });
  }
});

export { router as summaryRoutes };
