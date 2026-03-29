// Feature: social-command-center-pro, Property 10: Analytics Scrape Rate Limit

import { describe, it, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { expect } from 'vitest';

// Mock the db pool module before importing the service
vi.mock('../../backend/src/db', () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [{ user_id: 'test-user-1' }] }),
  },
}));

// Mock the session-vault service module
vi.mock('../../backend/src/services/session-vault.service', () => ({
  createSessionVaultService: vi.fn(() => ({
    listEntries: vi.fn().mockResolvedValue([]),
    getDecryptedCookies: vi.fn().mockResolvedValue([]),
  })),
}));

import { AnalyticsScraperService } from '../../backend/src/services/analytics-scraper.service';

/**
 * Minimal in-memory Redis mock.
 * Implements set, exists, and get to satisfy AnalyticsScraperService rate-limit logic.
 */
function createMockRedis() {
  const store: Map<string, { value: string; expiresAt: number | null }> = new Map();

  return {
    async exists(key: string): Promise<number> {
      const entry = store.get(key);
      if (!entry) return 0;
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        store.delete(key);
        return 0;
      }
      return 1;
    },
    async set(key: string, value: string, exFlag?: string, ttl?: number): Promise<'OK'> {
      const expiresAt =
        exFlag === 'EX' && ttl != null ? Date.now() + ttl * 1000 : null;
      store.set(key, { value, expiresAt });
      return 'OK';
    },
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    _store: store,
  };
}

describe('Property 10: Analytics Scrape Rate Limit', () => {
  /**
   * **Validates: Requirements 10.5**
   *
   * For any sequence of N scrape calls for the same (userId, platform),
   * at most 1 call succeeds within a 30-minute window — subsequent calls
   * return null due to the Redis rate-limit key (TTL 1800s).
   */
  it('allows at most 1 successful scrape per (user, platform) within a 30-minute window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        async (n) => {
          const mockRedis = createMockRedis();
          // Cast to any to satisfy the Redis type expected by the constructor
          const service = new AnalyticsScraperService(mockRedis as any);

          const postId = 'post-abc-123';
          const platform = 'instagram';

          const results: (object | null)[] = [];
          for (let i = 0; i < n; i++) {
            const result = await service.scrapePost(postId, platform);
            results.push(result);
          }

          // Only the first call should succeed; all subsequent calls must return null
          const successCount = results.filter((r) => r !== null).length;
          return successCount <= 1;
        },
      ),
      { numRuns: 100 },
    );
  });
});
