import { Router } from 'express';
import { z } from 'zod';
import { ProjectService } from '../services/project-service.js';
import { TaskService } from '../services/task-service.js';
import { createManagedListRouter } from './managed-list-routes.js';

// Validation schemas
const createProjectSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

const updateProjectSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  isHidden: z.boolean().optional(),
});

// Create service instances
const taskService = new TaskService();
const projectService = new ProjectService(taskService);

// Initialize service
projectService.init().catch(err => {
  console.error('Failed to initialize ProjectService:', err);
});

// Create router using the generic factory
const router = createManagedListRouter(
  projectService,
  createProjectSchema,
  updateProjectSchema
);

export default router;
