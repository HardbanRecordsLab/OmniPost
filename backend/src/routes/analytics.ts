// backend/src/routes/analytics.ts

import { FastifyInstance } from 'fastify';
import { pool } from '../../db';
import { analyticsScraperService } from '../services/analytics-scraper.service';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /api/analytics — aggregated analytics per platform
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);

        const result = await pool.query(
          `SELECT
             s.platform,
             COUNT(s.id)::int          AS snapshot_count,
             SUM(s.likes)::int         AS total_likes,
             SUM(s.comments)::int      AS total_comments,
             SUM(s.shares)::int        AS total_shares,
             SUM(s.views)::int         AS total_views,
             MAX(s.scraped_at)         AS last_scraped_at
           FROM analytics_snapshots s
           JOIN posts p ON p.id = s.post_id
           WHERE p.user_id = $1
           GROUP BY s.platform
           ORDER BY s.platform`,
          [userId]
        );

        return { analytics: result.rows };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // GET /api/analytics/posts/:id — analytics snapshots for a specific post
  fastify.get<{ Params: { id: string } }>(
    '/posts/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const { id: postId } = request.params;

        // Verify post belongs to user
        const postCheck = await pool.query(
          'SELECT id FROM posts WHERE id = $1 AND user_id = $2',
          [postId, userId]
        );
        if (postCheck.rows.length === 0) {
          reply.statusCode = 404;
          return { error: 'Post not found' };
        }

        const result = await pool.query(
          `SELECT id, post_id, platform, likes, comments, shares, views, scraped_at
           FROM analytics_snapshots
           WHERE post_id = $1
           ORDER BY scraped_at DESC`,
          [postId]
        );

        return { snapshots: result.rows };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );

  // POST /api/analytics/scrape/:postId — trigger manual scrape
  fastify.post<{ Params: { postId: string } }>(
    '/scrape/:postId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = String((request.user as any).userId);
        const { postId } = request.params;

        // Verify post belongs to user and get platform
        const postResult = await pool.query(
          'SELECT id, platforms, platform_ids FROM posts WHERE id = $1 AND user_id = $2',
          [postId, userId]
        );
        if (postResult.rows.length === 0) {
          reply.statusCode = 404;
          return { error: 'Post not found' };
        }

        const post = postResult.rows[0];
        let platform: string = 'unknown';
        if (Array.isArray(post.platforms) && post.platforms.length > 0) {
          platform = post.platforms[0];
        } else if (typeof post.platform_ids === 'string' && post.platform_ids) {
          platform = post.platform_ids.split(',')[0].trim();
        }

        // Trigger scrape asynchronously
        analyticsScraperService.scrapePost(postId, platform).catch((err) => {
          fastify.log.error(`Manual scrape failed for post ${postId}:`, err);
        });

        reply.statusCode = 202;
        return { message: 'Scrape triggered', postId, platform };
      } catch (error) {
        fastify.log.error(error);
        reply.statusCode = 500;
        return { error: 'Internal server error' };
      }
    }
  );
}
