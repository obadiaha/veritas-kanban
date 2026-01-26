import { Router, type Router as RouterType } from 'express';
import { getTraceService } from '../services/trace-service.js';

const router: RouterType = Router();

/**
 * GET /api/traces/status
 * Get tracing status (enabled/disabled)
 */
router.get('/status', async (_req, res, next) => {
  try {
    const traceService = getTraceService();
    res.json({
      enabled: traceService.isEnabled(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/traces/enable
 * Enable tracing
 */
router.post('/enable', async (_req, res, next) => {
  try {
    const traceService = getTraceService();
    traceService.setEnabled(true);
    res.json({ enabled: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/traces/disable
 * Disable tracing
 */
router.post('/disable', async (_req, res, next) => {
  try {
    const traceService = getTraceService();
    traceService.setEnabled(false);
    res.json({ enabled: false });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/traces/:attemptId
 * Get a trace by attempt ID
 */
router.get('/:attemptId', async (req, res, next) => {
  try {
    const traceService = getTraceService();
    const trace = await traceService.getTrace(req.params.attemptId);
    
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }
    
    res.json(trace);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/traces/task/:taskId
 * List all traces for a task
 */
router.get('/task/:taskId', async (req, res, next) => {
  try {
    const traceService = getTraceService();
    const traces = await traceService.listTraces(req.params.taskId);
    res.json(traces);
  } catch (error) {
    next(error);
  }
});

export default router;
