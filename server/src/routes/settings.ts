import { Router, type Router as RouterType } from 'express';
import { ConfigService } from '../services/config-service.js';
import { getTelemetryService } from '../services/telemetry-service.js';
import { getAttachmentService } from '../services/attachment-service.js';
import type { FeatureSettings } from '@veritas-kanban/shared';
import { FeatureSettingsPatchSchema } from '../schemas/feature-settings-schema.js';
import { strictRateLimit } from '../middleware/rate-limit.js';
import { auditLog } from '../services/audit-service.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { createLogger } from '../lib/logger.js';
const log = createLogger('settings');

const router: RouterType = Router();
const configService = new ConfigService();

/**
 * Sync feature settings to affected server-side services.
 * Called on PATCH and on server startup.
 */
export function syncSettingsToServices(settings: FeatureSettings): void {
  // Sync telemetry settings
  const telemetry = getTelemetryService();
  telemetry.configure({
    enabled: settings.telemetry.enabled,
    retention: settings.telemetry.retentionDays,
    traces: settings.telemetry.enableTraces,
  });

  // Sync attachment limits
  const attachments = getAttachmentService();
  attachments.setLimits({
    maxFileSize: settings.tasks.attachmentMaxFileSize,
    maxFilesPerTask: settings.tasks.attachmentMaxPerTask,
    maxTotalSize: settings.tasks.attachmentMaxTotalSize,
  });
}

// GET /api/settings/features — returns full feature settings with defaults merged
router.get('/features', async (_req, res) => {
  try {
    const features = await configService.getFeatureSettings();
    res.json(features);
  } catch (error) {
    log.error({ err: error }, 'Error getting feature settings');
    res.status(500).json({ error: 'Failed to get feature settings' });
  }
});

// PATCH /api/settings/features — deep merge partial updates
// strictRateLimit middleware: 10 req/min per IP
router.patch('/features', strictRateLimit, async (req, res) => {
  try {
    // Validate with Zod — strips unknown keys, rejects dangerous ones
    const parseResult = FeatureSettingsPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid settings payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }
    const patch = parseResult.data;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' });
    }

    const updated = await configService.updateFeatureSettings(patch);
    syncSettingsToServices(updated);

    // Audit log
    const authReq = req as AuthenticatedRequest;
    await auditLog({
      action: 'settings.update',
      actor: authReq.auth?.keyName || 'unknown',
      resource: 'features',
      details: { keys: Object.keys(patch) },
    });

    res.json(updated);
  } catch (error) {
    log.error({ err: error }, 'Error updating feature settings');
    res.status(500).json({ error: 'Failed to update feature settings' });
  }
});

export { router as settingsRoutes };
