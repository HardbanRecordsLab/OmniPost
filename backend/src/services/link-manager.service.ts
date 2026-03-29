// backend/src/services/link-manager.service.ts

import { Pool } from 'pg';
import crypto from 'crypto';

export interface TrackedLink {
  id: string;
  userId: string;
  slug: string;
  originalUrl: string;
  clickCount: number;
  createdAt: string;
}

export interface ClickMetadata {
  userAgent?: string;
  referrer?: string;
  ipHash?: string;
}

export interface LinkStats extends TrackedLink {
  clicks: Array<{
    clickedAt: string;
    userAgent: string | null;
    referrer: string | null;
    ipHash: string | null;
  }>;
  referrerBreakdown: Record<string, number>;
  uaBreakdown: Record<string, number>;
}

const ALIAS_REGEX = /^[a-zA-Z0-9-]{1,50}$/;

export function createLinkManagerService(pool: Pool) {
  async function shortenUrl(
    userId: string,
    originalUrl: string,
    customAlias?: string
  ): Promise<TrackedLink> {
    let slug: string;

    if (customAlias !== undefined) {
      if (!ALIAS_REGEX.test(customAlias)) {
        const err: any = new Error('Invalid alias format. Use 1–50 alphanumeric characters or hyphens.');
        err.statusCode = 400;
        throw err;
      }
      slug = customAlias;
    } else {
      slug = crypto.randomBytes(4).toString('hex');
    }

    try {
      const result = await pool.query<TrackedLink>(
        `INSERT INTO tracked_links (user_id, slug, original_url, click_count, created_at)
         VALUES ($1, $2, $3, 0, NOW())
         RETURNING id, user_id AS "userId", slug, original_url AS "originalUrl",
                   click_count AS "clickCount", created_at AS "createdAt"`,
        [userId, slug, originalUrl]
      );
      return result.rows[0];
    } catch (err: any) {
      if (err.code === '23505') {
        const conflict: any = new Error(`Slug "${slug}" is already in use.`);
        conflict.statusCode = 409;
        throw conflict;
      }
      throw err;
    }
  }

  async function recordClick(slug: string, metadata: ClickMetadata): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO link_clicks (slug, user_agent, referrer, ip_hash, clicked_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [slug, metadata.userAgent ?? null, metadata.referrer ?? null, metadata.ipHash ?? null]
      );
      await client.query(
        `UPDATE tracked_links SET click_count = click_count + 1 WHERE slug = $1`,
        [slug]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function getLinkStats(userId: string, linkId: string): Promise<LinkStats> {
    const linkResult = await pool.query(
      `SELECT id, user_id AS "userId", slug, original_url AS "originalUrl",
              click_count AS "clickCount", created_at AS "createdAt"
       FROM tracked_links
       WHERE id = $1 AND user_id = $2`,
      [linkId, userId]
    );

    if (linkResult.rows.length === 0) {
      const err: any = new Error('Link not found.');
      err.statusCode = 404;
      throw err;
    }

    const link = linkResult.rows[0] as TrackedLink;

    const clicksResult = await pool.query(
      `SELECT clicked_at AS "clickedAt", user_agent AS "userAgent",
              referrer, ip_hash AS "ipHash"
       FROM link_clicks
       WHERE slug = $1
       ORDER BY clicked_at DESC
       LIMIT 500`,
      [link.slug]
    );

    const clicks = clicksResult.rows;

    const referrerBreakdown: Record<string, number> = {};
    const uaBreakdown: Record<string, number> = {};

    for (const click of clicks) {
      const ref = click.referrer ?? 'direct';
      referrerBreakdown[ref] = (referrerBreakdown[ref] ?? 0) + 1;

      const ua = click.userAgent ?? 'unknown';
      uaBreakdown[ua] = (uaBreakdown[ua] ?? 0) + 1;
    }

    return { ...link, clicks, referrerBreakdown, uaBreakdown };
  }

  async function getLinks(userId: string): Promise<TrackedLink[]> {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", slug, original_url AS "originalUrl",
              click_count AS "clickCount", created_at AS "createdAt"
       FROM tracked_links
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async function deleteLink(userId: string, linkId: string): Promise<void> {
    const result = await pool.query(
      `DELETE FROM tracked_links WHERE id = $1 AND user_id = $2`,
      [linkId, userId]
    );
    if (result.rowCount === 0) {
      const err: any = new Error('Link not found.');
      err.statusCode = 404;
      throw err;
    }
  }

  return { shortenUrl, recordClick, getLinkStats, getLinks, deleteLink };
}
