// backend/src/routes/media.ts

import { FastifyInstance } from 'fastify';
import { mediaService } from '../services/media.service';

export async function mediaRoutes(fastify: FastifyInstance) {
  // GET /api/media — list media with optional filters
  fastify.get<{
    Querystring: { type?: string; search?: string; page?: string; limit?: string; folder?: string };
  }>(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const { type, search, page, limit } = request.query;

        const items = await mediaService.listMedia(userId, {
          type,
          search,
          page: page ? parseInt(page, 10) : undefined,
          limit: limit ? parseInt(limit, 10) : undefined,
        });

        return items;
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // POST /api/media/upload — multipart file upload
  fastify.post(
    '/upload',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const data = await request.file();

        if (!data) {
          reply.statusCode = 400;
          return { error: 'No file provided' };
        }

        const buffer = await data.toBuffer();

        const result = await mediaService.uploadMedia(userId, {
          buffer,
          mimetype: data.mimetype,
          originalname: data.filename,
          size: buffer.length,
        });

        reply.statusCode = 201;
        return result;
      } catch (error: any) {
        fastify.log.error(error);
        const status = error.statusCode ?? 500;
        reply.statusCode = status;
        return { error: error.message || 'Internal server error' };
      }
    }
  );

  // DELETE /api/media/:id — delete a media item
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const { id } = request.params;

        const result = await mediaService.deleteMedia(userId, id);

        if (!result.success) {
          reply.statusCode = 409;
          return {
            error: 'Media is attached to unpublished posts',
            affectedPosts: result.affectedPosts,
          };
        }

        return { message: 'Media deleted successfully' };
      } catch (error: any) {
        fastify.log.error(error);
        if (error.message === 'Media not found') {
          reply.statusCode = 404;
          return { error: 'Media not found' };
        }
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // POST /api/media/:id/attach — attach media to a post
  fastify.post<{ Params: { id: string }; Body: { postId: string } }>(
    '/:id/attach',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { postId } = request.body as { postId: string };

        if (!postId) {
          reply.statusCode = 400;
          return { error: 'postId is required' };
        }

        await mediaService.attachMediaToPost(postId, id);
        return { message: 'Media attached to post successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );
}
