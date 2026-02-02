import { Router, type Router as RouterType } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authorize } from '../middleware/auth.js';
import { MODEL_COSTS, type ModelPricing } from '@veritas-kanban/shared';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { createLogger } from '../lib/logger.js';
import { z } from 'zod';
import { validate, type ValidatedRequest } from '../middleware/validate.js';

const log = createLogger('models');
const router: RouterType = Router();

// Path to custom model costs override file
const CUSTOM_COSTS_PATH = join(process.cwd(), '.veritas-kanban', 'model-costs.json');

// Zod schema for PATCH request
const UpdateModelCostsSchema = z.record(
  z.string(),
  z.object({
    inputPer1M: z.number().positive(),
    outputPer1M: z.number().positive(),
    cachePer1M: z.number().positive().optional(),
  })
);

type UpdateModelCostsBody = z.infer<typeof UpdateModelCostsSchema>;

/**
 * Load model costs (default + custom overrides)
 */
async function loadModelCosts(): Promise<Record<string, ModelPricing>> {
  const costs = { ...MODEL_COSTS };

  try {
    const customData = await readFile(CUSTOM_COSTS_PATH, 'utf-8');
    const customCosts = JSON.parse(customData) as Record<string, ModelPricing>;
    Object.assign(costs, customCosts);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      log.warn('Failed to load custom model costs:', error.message);
    }
  }

  return costs;
}

/**
 * GET /api/models/costs
 * Get all model pricing
 */
router.get(
  '/costs',
  asyncHandler(async (_req, res) => {
    const costs = await loadModelCosts();
    res.json(costs);
  })
);

/**
 * PATCH /api/models/costs
 * Update model pricing (admin only)
 *
 * Stores custom overrides in .veritas-kanban/model-costs.json
 */
router.patch(
  '/costs',
  authorize('admin'),
  validate({ body: UpdateModelCostsSchema }),
  asyncHandler(async (req: ValidatedRequest<unknown, unknown, UpdateModelCostsBody>, res) => {
    const updates = req.validated.body!;

    // Load existing custom costs
    let customCosts: Record<string, ModelPricing> = {};
    try {
      const data = await readFile(CUSTOM_COSTS_PATH, 'utf-8');
      customCosts = JSON.parse(data);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        log.warn('Failed to load existing custom costs:', error.message);
      }
    }

    // Merge updates
    Object.assign(customCosts, updates);

    // Write back
    await writeFile(CUSTOM_COSTS_PATH, JSON.stringify(customCosts, null, 2), 'utf-8');

    log.info(`Updated model costs for ${Object.keys(updates).length} model(s)`);

    // Return merged costs
    const allCosts = await loadModelCosts();
    res.json(allCosts);
  })
);

export default router;
