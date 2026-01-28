import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { TaskService } from '../services/task-service.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { NotFoundError, ValidationError } from '../middleware/error-handler.js';

const router: RouterType = Router();
const taskService = new TaskService();

// Validation schemas
const addSubtaskSchema = z.object({
  title: z.string().min(1).max(200),
});

const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});

// POST /api/tasks/:id/subtasks - Add subtask
router.post('/:id/subtasks', asyncHandler(async (req, res) => {
  let title: string;
  try {
    ({ title } = addSubtaskSchema.parse(req.body));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', error.errors);
    }
    throw error;
  }
  
  const task = await taskService.getTask(req.params.id as string);
  if (!task) {
    throw new NotFoundError('Task not found');
  }

  const subtask = {
    id: `subtask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    completed: false,
    created: new Date().toISOString(),
  };

  const subtasks = [...(task.subtasks || []), subtask];
  const updatedTask = await taskService.updateTask((req.params.id as string), { subtasks });
  
  res.status(201).json(updatedTask);
}));

// PATCH /api/tasks/:id/subtasks/:subtaskId - Update subtask
router.patch('/:id/subtasks/:subtaskId', asyncHandler(async (req, res) => {
  let updates;
  try {
    updates = updateSubtaskSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', error.errors);
    }
    throw error;
  }
  
  const task = await taskService.getTask(req.params.id as string);
  if (!task) {
    throw new NotFoundError('Task not found');
  }

  const subtasks = task.subtasks || [];
  const subtaskIndex = subtasks.findIndex(s => s.id === (req.params.subtaskId as string));
  if (subtaskIndex === -1) {
    throw new NotFoundError('Subtask not found');
  }

  subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], ...updates };

  // Check if we should auto-complete the parent task
  let taskUpdates: any = { subtasks };
  if (task.autoCompleteOnSubtasks && subtasks.every(s => s.completed)) {
    taskUpdates.status = 'done';
  }

  const updatedTask = await taskService.updateTask((req.params.id as string), taskUpdates);
  
  res.json(updatedTask);
}));

// DELETE /api/tasks/:id/subtasks/:subtaskId - Delete subtask
router.delete('/:id/subtasks/:subtaskId', asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.params.id as string);
  if (!task) {
    throw new NotFoundError('Task not found');
  }

  const subtasks = (task.subtasks || []).filter(s => s.id !== (req.params.subtaskId as string));
  const updatedTask = await taskService.updateTask((req.params.id as string), { subtasks });
  
  res.json(updatedTask);
}));

export { router as taskSubtaskRoutes };
