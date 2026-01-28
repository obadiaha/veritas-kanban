import { z } from 'zod';
import { MetricsPeriodSchema } from './common.js';

/**
 * GET /api/metrics/* query params
 */
export const MetricsQuerySchema = z.object({
  period: MetricsPeriodSchema.default('24h'),
  project: z.string().optional(),
});

/**
 * GET /api/metrics/tasks - query params (project only, no period)
 */
export const TaskMetricsQuerySchema = z.object({
  project: z.string().optional(),
});

export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;
export type TaskMetricsQuery = z.infer<typeof TaskMetricsQuerySchema>;
