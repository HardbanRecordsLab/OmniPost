// backend/src/routes/ai.ts

import { FastifyInstance } from 'fastify';
import { aiService } from '../services/ai.service';

export async function aiRoutes(fastify: FastifyInstance) {
  // POST /api/ai/variants — generate platform-specific content variants
  fastify.post<{ Body: unknown }>(
    '/variants',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { baseContent, platforms, timeoutMs } = body || {};

        if (!baseContent || typeof baseContent !== 'string' || baseContent.trim() === '') {
          reply.statusCode = 400;
          return { error: 'Missing required field: baseContent' };
        }

        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
          reply.statusCode = 400;
          return { error: 'Missing required field: platforms (must be a non-empty array)' };
        }

        const variants = await aiService.generatePlatformVariants(
          baseContent,
          platforms,
          timeoutMs !== undefined ? { timeoutMs } : undefined
        );

        return { variants };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // POST /api/ai/hashtags — generate hashtags for a platform
  fastify.post<{ Body: unknown }>(
    '/hashtags',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { content, platform } = body || {};

        if (!content || typeof content !== 'string' || content.trim() === '') {
          reply.statusCode = 400;
          return { error: 'Missing required field: content' };
        }

        if (!platform || typeof platform !== 'string' || platform.trim() === '') {
          reply.statusCode = 400;
          return { error: 'Missing required field: platform' };
        }

        const hashtags = await aiService.generateHashtagsForPlatform(content, platform);

        return { hashtags };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );
}
