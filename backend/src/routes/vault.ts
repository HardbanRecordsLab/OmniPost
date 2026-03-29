// backend/src/routes/vault.ts

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { z } from 'zod';
import { createSessionVaultService } from '../services/session-vault.service';

const captureBodySchema = z.object({
  platform: z.string().min(1),
  loginUrl: z.string().url(),
});

export async function vaultRoutes(fastify: FastifyInstance) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const vaultService = createSessionVaultService(pool);

  // POST /api/vault/capture — start supervised Puppeteer login session
  fastify.post<{ Body: unknown }>(
    '/capture',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const body = captureBodySchema.parse(request.body);

        const result = await vaultService.captureSession(
          userId,
          body.platform,
          body.loginUrl
        );

        reply.statusCode = 202;
        return result;
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.statusCode = 400;
          return { error: 'Validation error', details: error.errors };
        }
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // GET /api/vault/capture/:sessionId — poll for capture result
  fastify.get<{ Params: { sessionId: string } }>(
    '/capture/:sessionId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { sessionId } = request.params;
        const result = await vaultService.pollCaptureResult(sessionId);
        return result;
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // GET /api/vault — list vault entries
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const { platform } = request.query as { platform?: string };

        const entries = await vaultService.listEntries(userId, platform);
        return { entries };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // DELETE /api/vault/:entryId — delete vault entry
  fastify.delete<{ Params: { entryId: string } }>(
    '/:entryId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const { entryId } = request.params;

        await vaultService.deleteEntry(userId, entryId);
        return { message: 'Entry deleted successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );
}
