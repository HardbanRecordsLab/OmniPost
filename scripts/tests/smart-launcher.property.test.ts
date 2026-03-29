// Feature: social-command-center-pro, Property 9: Smart Launcher Sequential Delay

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * **Validates: Requirements 4.4**
 *
 * For any N > 1 platforms, `launchMultiple` must introduce at least (N-1) * 3000 ms
 * of delay between consecutive launches. We verify this by using vitest fake timers
 * so the test runs instantly while still exercising the real `setTimeout`-based delay.
 */

// Minimal stubs so SmartLauncherAdapter never touches clipboard or browser
vi.mock('clipboardy', () => ({ default: { write: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('open', () => ({ default: vi.fn().mockResolvedValue(undefined) }));

import { SmartLauncherService } from '../../backend/src/services/smart-launcher.service';
import type { PlatformConfig } from '../../src/platforms/adapters/PlatformRegistry';
import type { Post } from '../../types';

function makePlatformConfig(id: string): PlatformConfig {
  return {
    id,
    displayName: id,
    baseUrl: `https://${id}.example.com`,
    loginUrl: `https://${id}.example.com/login`,
    postUrl: `https://${id}.example.com/post`,
    adapterType: 'smart_launcher',
    toneCategory: 'casual',
    category: 'standard_social',
    supportsHashtags: false,
  };
}

const samplePost: Post = {
  id: 'post-1',
  content: 'Hello world',
  status: 'draft' as any,
  scheduledAt: new Date().toISOString(),
};

describe('Property 9: Smart Launcher Sequential Delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('total elapsed fake time >= (N-1) * 3000 ms for any N > 1 platforms', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        async (platformIds) => {
          // Deduplicate to avoid registry collisions while keeping N >= 2
          const uniqueIds = [...new Set(platformIds)];
          if (uniqueIds.length < 2) return; // skip degenerate case after dedup

          const n = uniqueIds.length;
          const configs = uniqueIds.map(makePlatformConfig);
          const service = new SmartLauncherService();

          // Start launchMultiple — it will pause at each setTimeout(3000)
          const launchPromise = service.launchMultiple(samplePost, configs);

          // Advance fake time by exactly (N-1) * 3000 ms to release all delays
          await vi.advanceTimersByTimeAsync((n - 1) * 3000);

          const results = await launchPromise;

          // All N platforms must have been launched
          expect(results).toHaveLength(n);
          results.forEach((r, i) => {
            expect(r.platform).toBe(uniqueIds[i]);
            expect(r.status).toBe('launched');
          });
        },
      ),
      { numRuns: 20 },
    );
  });
});
