import { Router, type Router as RouterType } from 'express';
import { ConfigService } from '../services/config-service.js';
import { getTelemetryService } from '../services/telemetry-service.js';
import { getAttachmentService } from '../services/attachment-service.js';
import type { FeatureSettings } from '@veritas-kanban/shared';
import { FeatureSettingsPatchSchema } from '../schemas/feature-settings-schema.js';

const router: RouterType = Router();
const configService = new ConfigService();

// Simple rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

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
    console.error('Error getting feature settings:', error);
    res.status(500).json({ error: 'Failed to get feature settings' });
  }
});

// PATCH /api/settings/features — deep merge partial updates
router.patch('/features', async (req, res) => {
  try {
    // Rate limiting
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Max 10 settings updates per minute.' });
    }

    // Validate with Zod — strips unknown keys, rejects dangerous ones
    const parseResult = FeatureSettingsPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid settings payload',
        details: parseResult.error.issues.map(i => i.message),
      });
    }
    const patch = parseResult.data;
    
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' });
    }
    
    const updated = await configService.updateFeatureSettings(patch);
    syncSettingsToServices(updated);
    res.json(updated);
  } catch (error) {
    console.error('Error updating feature settings:', error);
    res.status(500).json({ error: 'Failed to update feature settings' });
  }
});

export { router as settingsRoutes };
