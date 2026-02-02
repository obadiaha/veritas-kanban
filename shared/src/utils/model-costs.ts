/**
 * Model pricing and cost calculation utilities
 */

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  cachePer1M?: number;
}

/**
 * Default model pricing (cost per 1M tokens)
 * These can be overridden via .veritas-kanban/model-costs.json
 */
export const MODEL_COSTS: Record<string, ModelPricing> = {
  'anthropic/claude-opus-4-5': {
    inputPer1M: 15.0,
    outputPer1M: 75.0,
  },
  'anthropic/claude-sonnet-4-5': {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
  },
  'anthropic/claude-haiku-4-5': {
    inputPer1M: 0.8,
    outputPer1M: 4.0,
  },
  'openai-codex/gpt-5.2': {
    inputPer1M: 2.5,
    outputPer1M: 10.0,
  },
  'openai-codex/gpt-5.1': {
    inputPer1M: 2.0,
    outputPer1M: 8.0,
  },
  'openai-codex/gpt-5.2-codex': {
    inputPer1M: 2.5,
    outputPer1M: 10.0,
  },
};

/**
 * Default pricing for unknown models (Sonnet-level)
 */
const DEFAULT_PRICING: ModelPricing = {
  inputPer1M: 3.0,
  outputPer1M: 15.0,
};

/**
 * Calculate cost for a given model and token counts
 * @param model Model identifier
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param cacheTokens Number of cache tokens (optional)
 * @returns Cost in USD, rounded to 4 decimal places
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheTokens?: number
): number {
  const pricing = MODEL_COSTS[model] || DEFAULT_PRICING;

  let cost =
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M;

  if (cacheTokens && pricing.cachePer1M) {
    cost += (cacheTokens / 1_000_000) * pricing.cachePer1M;
  }

  return Math.round(cost * 10000) / 10000; // 4 decimal places
}

/**
 * Get pricing for a specific model
 * @param model Model identifier
 * @returns ModelPricing object (returns default if model not found)
 */
export function getModelPricing(model: string): ModelPricing {
  return MODEL_COSTS[model] || DEFAULT_PRICING;
}

/**
 * Check if a model has explicit pricing configured
 * @param model Model identifier
 * @returns true if model has explicit pricing
 */
export function hasModelPricing(model: string): boolean {
  return model in MODEL_COSTS;
}
