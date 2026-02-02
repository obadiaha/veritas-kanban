/**
 * Metrics module barrel export.
 * Re-exports everything for backwards compatibility with the original metrics-service.ts.
 */

// Class and singleton
export { MetricsService, getMetricsService } from './metrics-service.js';

// All types
export type {
  MetricsPeriod,
  TaskMetrics,
  AgentBreakdown,
  RunMetrics,
  TokenMetrics,
  DurationMetrics,
  TrendDirection,
  TrendComparison,
  RunAccumulator,
  TokenAccumulator,
  FailedRunDetails,
  DailyTrendPoint,
  TrendsData,
  BudgetMetrics,
  AgentComparisonData,
  AgentRecommendation,
  AgentComparisonResult,
  VelocityTrend,
  SprintVelocityPoint,
  CurrentSprintProgress,
  VelocityMetrics,
} from './types.js';

// Cost and accuracy types
export type { CostMetrics, ModelCostBreakdown, AccuracyMetrics } from './cost-metrics.js';
