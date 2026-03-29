// Feature: social-command-center-pro, Property 14: Anti-Ban Cool-Down Enforcement

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { expect } from 'vitest';
import { AntiBanSystem } from '../../src/platforms/adapters/base/AntiBanSystem';

/**
 * Minimal in-memory Redis mock.
 * Implements zadd, zcount, and expire (no-op) to satisfy AntiBanSystem.
 */
function createMockRedis() {
  const store: Record<string, Map<string, number>> = {};

  return {
    zadd(key: string, score: number, member: string): void {
      if (!store[key]) store[key] = new Map();
      store[key].set(member, score);
    },
    zcount(key: string, min: number, max: number | '+inf'): number {
      const set = store[key];
      if (!set) return 0;
      const maxVal = max === '+inf' ? Infinity : max;
      let count = 0;
      for (const score of set.values()) {
        if (score >= min && score <= maxVal) count++;
      }
      return count;
    },
    expire(_key: string, _ttl: number): void {
      // no-op for testing
    },
  };
}

describe('Property 14: Anti-Ban Cool-Down Enforcement', () => {
  /**
   * **Validates: Requirements 5.4**
   *
   * For any N > 5 publish events recorded within the last 3600 s,
   * checkCoolDown must return >= 1_800_000 ms.
   */
  it('returns >= 1_800_000 ms cool-down when more than 5 publishes occur in a 1-hour window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 6, max: 20 }),
        async (n) => {
          const mockRedis = createMockRedis();
          const system = new AntiBanSystem(mockRedis);

          const platform = 'test-platform';
          const userId = 'test-user';
          const now = Date.now();

          // Simulate N recordPublish calls within the last 3600 s
          for (let i = 0; i < n; i++) {
            // Spread events across the window (all within last 3600 s)
            const offset = Math.floor((i / n) * 3_500_000); // stays within 3600 s
            const eventTime = now - 3_500_000 + offset;
            const key = `anti_ban:${userId}:${platform}`;
            mockRedis.zadd(key, eventTime, `event-${i}`);
          }

          const coolDown = await system.checkCoolDown(platform, userId);
          return coolDown >= 1_800_000;
        },
      ),
      { numRuns: 100 },
    );
  });
});
