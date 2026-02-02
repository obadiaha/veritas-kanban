import { z } from 'zod';
import { TaskIdParamsSchema } from './common.js';

/**
 * Schema for creating/updating a cost estimate
 */
export const CostEstimateSchema = z.object({
  estimatedTokens: z.number().int().positive(),
  estimatedCost: z.number().positive(),
  estimatedModel: z.string().min(1),
  estimatedDuration: z.number().int().positive().optional(),
  confidence: z.enum(['low', 'medium', 'high']),
  reasoning: z.string().optional(),
  estimatedBy: z.string().min(1),
});

export type CostEstimateInput = z.infer<typeof CostEstimateSchema>;

/**
 * Schema for task ID parameter (uses 'id' instead of 'taskId')
 */
export const TaskCostParamsSchema = z.object({
  id: z.string().min(1),
});

export type TaskCostParams = z.infer<typeof TaskCostParamsSchema>;
