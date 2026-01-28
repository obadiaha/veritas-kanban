import { Router } from 'express';
import { z } from 'zod';
import { TagService } from '../services/tag-service.js';
import { TaskService } from '../services/task-service.js';
import { createManagedListRouter } from './managed-list-routes.js';

// Validation schemas
const createTagSchema = z.object({
  label: z.string().min(1),
  color: z.string().min(1),
});

const updateTagSchema = z.object({
  label: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  isHidden: z.boolean().optional(),
});

// Create service instances
const taskService = new TaskService();
const tagService = new TagService(taskService);

// Initialize service
tagService.init().catch(err => {
  console.error('Failed to initialize TagService:', err);
});

// Create router using the generic factory
const router = createManagedListRouter(
  tagService,
  createTagSchema,
  updateTagSchema
);

export default router;
