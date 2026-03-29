// backend/src/routes/platforms.ts

import { FastifyInstance } from 'fastify';
import { PlatformRegistry, PlatformConfig } from '../../../src/platforms/adapters/PlatformRegistry';

const registry = new PlatformRegistry();

export async function platformRoutes(fastify: FastifyInstance) {
  // GET /api/platforms — list all platform configs grouped by category
  fastify.get('/', async (request, reply) => {
    const all = registry.listAll();
    const grouped: Record<string, PlatformConfig[]> = {};
    for (const config of all) {
      if (!grouped[config.category]) {
        grouped[config.category] = [];
      }
      grouped[config.category].push(config);
    }
    return { platforms: grouped };
  });

  // POST /api/platforms — add new platform config
  fastify.post<{ Body: unknown }>(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const body = request.body as Partial<PlatformConfig>;

      if (!body.id || !body.displayName || !body.baseUrl) {
        reply.statusCode = 400;
        return { error: 'Missing required fields: id, displayName, baseUrl' };
      }

      const config = body as PlatformConfig;
      const validation = registry.validateConfig(config);
      if (!validation.valid) {
        reply.statusCode = 400;
        return { error: 'Invalid platform config', details: validation.errors };
      }

      try {
        registry.registerConfig(config);
        reply.statusCode = 201;
        return { platform: registry.getConfig(config.id) };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // PATCH /api/platforms/:id — update platform config
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const existing = registry.getConfig(id);

      if (!existing) {
        reply.statusCode = 404;
        return { error: `Platform '${id}' not found` };
      }

      const updates = request.body as Partial<PlatformConfig>;
      const updated: PlatformConfig = { ...existing, ...updates, id: existing.id };

      const validation = registry.validateConfig(updated);
      if (!validation.valid) {
        reply.statusCode = 400;
        return { error: 'Invalid platform config', details: validation.errors };
      }

      try {
        registry.registerConfig(updated);
        return { platform: registry.getConfig(existing.id) };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );
}
