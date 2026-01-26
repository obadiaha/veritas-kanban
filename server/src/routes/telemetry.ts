import { Router, type Router as RouterType } from 'express';
import { getTelemetryService } from '../services/telemetry-service.js';
import type { TelemetryEventType, TelemetryQueryOptions } from '@veritas-kanban/shared';

const router: RouterType = Router();

/**
 * GET /api/telemetry/events
 * Query telemetry events with optional filters
 * 
 * Query params:
 *   - type: Event type(s) to filter by (comma-separated)
 *   - since: ISO timestamp for start of range
 *   - until: ISO timestamp for end of range
 *   - taskId: Filter by task ID
 *   - project: Filter by project
 *   - limit: Max number of events to return
 */
router.get('/events', async (req, res, next) => {
  try {
    const telemetry = getTelemetryService();
    
    const options: TelemetryQueryOptions = {};

    if (req.query.type) {
      const types = (req.query.type as string).split(',') as TelemetryEventType[];
      options.type = types.length === 1 ? types[0] : types;
    }

    if (req.query.since) {
      options.since = req.query.since as string;
    }

    if (req.query.until) {
      options.until = req.query.until as string;
    }

    if (req.query.taskId) {
      options.taskId = req.query.taskId as string;
    }

    if (req.query.project) {
      options.project = req.query.project as string;
    }

    if (req.query.limit) {
      options.limit = parseInt(req.query.limit as string, 10);
    }

    const events = await telemetry.getEvents(options);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telemetry/events/task/:taskId
 * Get all events for a specific task
 */
router.get('/events/task/:taskId', async (req, res, next) => {
  try {
    const telemetry = getTelemetryService();
    const events = await telemetry.getTaskEvents(req.params.taskId);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telemetry/status
 * Get telemetry service status and configuration
 */
router.get('/status', async (req, res, next) => {
  try {
    const telemetry = getTelemetryService();
    const config = telemetry.getConfig();
    
    res.json({
      enabled: config.enabled,
      retention: config.retention,
      traces: config.traces,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telemetry/count
 * Count events by type within a time period
 * 
 * Query params:
 *   - type: Event type(s) to count (comma-separated, required)
 *   - since: ISO timestamp for start of range
 *   - until: ISO timestamp for end of range
 */
router.get('/count', async (req, res, next) => {
  try {
    if (!req.query.type) {
      res.status(400).json({ error: 'type query param is required' });
      return;
    }

    const telemetry = getTelemetryService();
    const types = (req.query.type as string).split(',') as TelemetryEventType[];
    
    const count = await telemetry.countEvents(
      types.length === 1 ? types[0] : types,
      req.query.since as string | undefined,
      req.query.until as string | undefined
    );

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

export default router;
