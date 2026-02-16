// omnipost/backend/src/routes/posts.ts

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
  scheduled_at: z.string().datetime().optional(),
});

export async function postRoutes(fastify: FastifyInstance) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Get user's posts
  fastify.get<{ Params: { status?: string } }>(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = (request.user as any).userId;
        const { status } = request.query as any;

        let query = 'SELECT * FROM posts WHERE user_id = $1';
        const params: any[] = [userId];

        if (status) {
          query += ' AND status = $2';
          params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const result = await pool.query(query, params);
        return { posts: result.rows };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // Create a new post
  fastify.post<{ Body: unknown }>(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = (request.user as any).userId;
        const body = createPostSchema.parse(request.body);

        const result = await pool.query(
          'INSERT INTO posts (user_id, title, content, status, scheduled_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, body.title, body.content, body.status, body.scheduled_at]
        );

        reply.statusCode = 201;
        return { message: 'Post created successfully', post: result.rows[0] };
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

  // Get a single post
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = (request.user as any).userId;
        const { id } = request.params;

        const result = await pool.query(
          'SELECT * FROM posts WHERE id = $1 AND user_id = $2',
          [id, userId]
        );

        if (result.rows.length === 0) {
          reply.statusCode = 404;
          return { error: 'Post not found' };
        }

        return { post: result.rows[0] };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // Update a post
  fastify.put<{ Params: { id: string }; Body: unknown }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = (request.user as any).userId;
        const { id } = request.params;
        const body = createPostSchema.partial().parse(request.body); // Allow partial updates

        const fields = Object.keys(body)
          .map((key, index) => `${key} = $${index + 3}`)
          .join(', ');
        const values = Object.values(body);

        if (fields.length === 0) {
          reply.statusCode = 400;
          return { error: 'No fields to update' };
        }

        const result = await pool.query(
          `UPDATE posts SET ${fields}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
          [id, userId, ...values]
        );

        if (result.rows.length === 0) {
          reply.statusCode = 404;
          return { error: 'Post not found' };
        }

        return { message: 'Post updated successfully', post: result.rows[0] };
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

  // Delete a post
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = (request.user as any).userId;
        const { id } = request.params;

        const result = await pool.query(
          'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *',
          [id, userId]
        );

        if (result.rows.length === 0) {
          reply.statusCode = 404;
          return { error: 'Post not found' };
        }

        return { message: 'Post deleted successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );
}
