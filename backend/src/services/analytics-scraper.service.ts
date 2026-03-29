// backend/src/services/analytics-scraper.service.ts

import Redis from 'ioredis';
import { pool } from '../../db';
import { createSessionVaultService } from './session-vault.service';

export interface AnalyticsSnapshot {
  postId: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  scrapedAt: Date;
}

// In-memory failure counter per postId+platform
const failureCounts = new Map<string, number>();

export class AnalyticsScraperService {
  private redis: Redis;
  private vaultService: ReturnType<typeof createSessionVaultService>;

  constructor(redis?: Redis) {
    this.redis = redis ?? new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.vaultService = createSessionVaultService(pool);
  }

  /**
   * Scrape analytics for a post. Skips if rate-limit key exists in Redis.
   * Requirements: 10.1–10.5
   */
  async scrapePost(postId: string, platform: string): Promise<AnalyticsSnapshot | null> {
    // 1. Get userId for this post (needed for vault lookup and rate-limit key)
    const postResult = await pool.query(
      'SELECT user_id FROM posts WHERE id = $1',
      [postId]
    );
    if (postResult.rows.length === 0) {
      console.warn(`[AnalyticsScraper] Post ${postId} not found`);
      return null;
    }
    const userId = String(postResult.rows[0].user_id);

    // 2. Check Redis rate limit (Task 11.2)
    const rateLimitKey = `analytics_scrape:${platform}:${userId}`;
    const exists = await this.redis.exists(rateLimitKey);
    if (exists) {
      console.log(`[AnalyticsScraper] Rate limit active for ${rateLimitKey}, skipping scrape`);
      return null;
    }

    try {
      // 3. Get session cookies from vault (if available)
      let cookies: any[] = [];
      try {
        const entries = await this.vaultService.listEntries(userId, platform);
        if (entries.length > 0) {
          cookies = await this.vaultService.getDecryptedCookies(userId, platform, entries[0].id);
        }
      } catch (err) {
        console.warn(`[AnalyticsScraper] Could not retrieve session cookies for ${platform}:`, err);
      }

      // 4. Attempt to scrape metrics
      // NOTE: Real platform-specific Puppeteer scraping needs to be implemented per platform.
      // This stub returns mock metrics and logs a reminder.
      console.log(
        `[AnalyticsScraper] TODO: Implement real Puppeteer scraping for platform "${platform}". ` +
        `Cookies available: ${cookies.length > 0}. Returning mock metrics.`
      );

      const metrics: AnalyticsSnapshot = {
        postId,
        platform,
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        scrapedAt: new Date(),
      };

      // 5. Store result in analytics_snapshots table
      await pool.query(
        `INSERT INTO analytics_snapshots (post_id, platform, likes, comments, shares, views, scraped_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [metrics.postId, metrics.platform, metrics.likes, metrics.comments, metrics.shares, metrics.views, metrics.scrapedAt]
      );

      // 6. Set rate-limit key with 1800s TTL
      await this.redis.set(rateLimitKey, '1', 'EX', 1800);

      // Reset failure count on success
      failureCounts.delete(`${postId}:${platform}`);

      return metrics;
    } catch (err: any) {
      console.error(`[AnalyticsScraper] Error scraping post ${postId} on ${platform}:`, err);
      await this.handleFailure(postId, platform);
      return null;
    }
  }

  /**
   * Increment failure count; after 3 failures set analytics_status = 'unavailable'.
   * Requirements: 10.3, 10.4
   */
  async handleFailure(postId: string, platform: string): Promise<void> {
    const key = `${postId}:${platform}`;
    const count = (failureCounts.get(key) ?? 0) + 1;
    failureCounts.set(key, count);

    console.warn(`[AnalyticsScraper] Failure #${count} for post ${postId} on ${platform}`);

    if (count >= 3) {
      await pool.query(
        `UPDATE posts SET analytics_status = 'unavailable' WHERE id = $1`,
        [postId]
      );
      console.warn(`[AnalyticsScraper] Marked post ${postId} analytics_status = 'unavailable' after ${count} failures`);
      failureCounts.delete(key);
    }
  }
}

export const analyticsScraperService = new AnalyticsScraperService();
