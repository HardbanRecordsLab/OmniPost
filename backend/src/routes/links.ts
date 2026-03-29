// backend/src/routes/links.ts

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { z } from 'zod';
import { createLinkManagerService } from '../services/link-manager.service';

const createLinkSchema = z.object({
  originalUrl: z.string().url(),
  customAlias: z.string().optional(),
});

export async function linkRoutes(fastify: FastifyInstance) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const linkService = createLinkManagerService(pool);

  // GET /api/links — list user's links
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const links = await linkService.getLinks(userId);
        return { links };
      } catch (err) {
        fastify.log.error(err);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // POST /api/links — create link
  fastify.post<{ Body: unknown }>(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const body = createLinkSchema.parse(request.body);
        const link = await linkService.shortenUrl(userId, body.originalUrl, body.customAlias);
        reply.statusCode = 201;
        return { link };
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          reply.statusCode = 400;
          return { error: 'Validation error', details: err.errors };
        }
        if (err.statusCode === 400 || err.statusCode === 409) {
          reply.statusCode = err.statusCode;
          return { error: err.message };
        }
        fastify.log.error(err);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // GET /api/links/:id/stats — get link stats
  fastify.get<{ Params: { id: string } }>(
    '/:id/stats',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const { id } = request.params;
        const stats = await linkService.getLinkStats(userId, id);
        return { stats };
      } catch (err: any) {
        if (err.statusCode === 404) {
          reply.statusCode = 404;
          return { error: err.message };
        }
        fastify.log.error(err);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // DELETE /api/links/:id — delete link
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const { id } = request.params;
        await linkService.deleteLink(userId, id);
        return { message: 'Link deleted successfully' };
      } catch (err: any) {
        if (err.statusCode === 404) {
          reply.statusCode = 404;
          return { error: err.message };
        }
        fastify.log.error(err);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );
}
