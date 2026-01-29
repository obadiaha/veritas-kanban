import { Router } from 'express';
import { z } from 'zod';
import type { ManagedListItem } from '@veritas-kanban/shared';
import type { ManagedListService } from '../services/managed-list-service.js';
import { createLogger } from '../lib/logger.js';
const log = createLogger('managed-list-routes');

/**
 * Create a generic Express router for a ManagedListService instance
 */
export function createManagedListRouter<T extends ManagedListItem>(
  service: ManagedListService<T>,
  createSchema?: z.ZodType<any>,
  updateSchema?: z.ZodType<any>
): Router {
  const router = Router();

  // GET / - List all items
  router.get('/', async (req, res) => {
    try {
      const includeHidden = req.query.includeHidden === 'true';
      const items = await service.list(includeHidden);
      res.json(items);
    } catch (err) {
      log.error({ err: err }, 'Error listing items');
      res.status(500).json({ error: 'Failed to list items' });
    }
  });

  // GET /:id - Get a single item
  router.get('/:id', async (req, res) => {
    try {
      const item = await service.get(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (err) {
      log.error({ err: err }, 'Error getting item');
      res.status(500).json({ error: 'Failed to get item' });
    }
  });

  // POST / - Create a new item
  router.post('/', async (req, res) => {
    try {
      // Validate with custom schema if provided
      const data = createSchema ? createSchema.parse(req.body) : req.body;

      const item = await service.create(data);
      res.status(201).json(item);
    } catch (err: any) {
      log.error({ err: err }, 'Error creating item');
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  // PATCH /:id - Update an item
  router.patch('/:id', async (req, res) => {
    try {
      // Validate with custom schema if provided
      const data = updateSchema ? updateSchema.parse(req.body) : req.body;

      const item = await service.update(req.params.id, data);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (err: any) {
      log.error({ err: err }, 'Error updating item');
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  // DELETE /:id - Delete an item
  router.delete('/:id', async (req, res) => {
    try {
      const force = req.query.force === 'true';
      const result = await service.delete(req.params.id, force);

      if (!result.deleted) {
        if (result.referenceCount !== undefined && result.referenceCount > 0) {
          return res.status(400).json({
            error: 'Cannot delete item with references',
            referenceCount: result.referenceCount,
          });
        }
        return res.status(400).json({ error: 'Cannot delete default item or item not found' });
      }

      res.status(204).send();
    } catch (err) {
      log.error({ err: err }, 'Error deleting item');
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // GET /:id/can-delete - Check if item can be deleted
  router.get('/:id/can-delete', async (req, res) => {
    try {
      const result = await service.canDelete(req.params.id);
      res.json(result);
    } catch (err) {
      log.error({ err: err }, 'Error checking delete permission');
      res.status(500).json({ error: 'Failed to check delete permission' });
    }
  });

  // POST /reorder - Reorder items
  router.post('/reorder', async (req, res) => {
    try {
      const schema = z.object({
        orderedIds: z.array(z.string()),
      });

      const { orderedIds } = schema.parse(req.body);
      const items = await service.reorder(orderedIds);
      res.json(items);
    } catch (err: any) {
      log.error({ err: err }, 'Error reordering items');
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      res.status(500).json({ error: 'Failed to reorder items' });
    }
  });

  return router;
}
