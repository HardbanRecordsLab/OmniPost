// Feature: social-command-center-pro, Property 11: Link Slug Uniqueness

import * as fc from 'fast-check';
import { createLinkManagerService } from '../../backend/src/services/link-manager.service';
import type { Pool } from 'pg';

/**
 * Property 11: Link Slug Uniqueness
 * Validates: Requirements 11.1, 11.5
 *
 * For any N in [2..50] calls to shortenUrl (without a custom alias),
 * all returned slugs must be distinct.
 */
describe('Link Manager - Link Slug Uniqueness', () => {
  it('Property 11: all generated slugs are distinct across N calls', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 50 }), async (n: number) => {
        // In-memory store tracking inserted slugs to simulate DB uniqueness
        const insertedSlugs = new Set<string>();
        let idCounter = 1;

        const mockPool = {
          query: async (sql: string, params: any[]) => {
            if (sql.includes('INSERT INTO tracked_links')) {
              const slug = params[1] as string;
              if (insertedSlugs.has(slug)) {
                const err: any = new Error('duplicate key');
                err.code = '23505';
                throw err;
              }
              insertedSlugs.add(slug);
              return {
                rows: [{
                  id: String(idCounter++),
                  userId: params[0],
                  slug,
                  originalUrl: params[2],
                  clickCount: 0,
                  createdAt: new Date().toISOString(),
                }],
              };
            }
            return { rows: [] };
          },
        } as unknown as Pool;

        const service = createLinkManagerService(mockPool);

        const slugs: string[] = [];
        for (let i = 0; i < n; i++) {
          const link = await service.shortenUrl('user-1', `https://example.com/${i}`);
          slugs.push(link.slug);
        }

        const uniqueSlugs = new Set(slugs);
        expect(uniqueSlugs.size).toBe(n);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: social-command-center-pro, Property 12: Custom Alias Format

/**
 * Property 12: Custom Alias Format
 * Validates: Requirements 11.4
 *
 * For any arbitrary string used as a custom alias:
 * - If it matches /^[a-zA-Z0-9-]{1,50}$/ → shortenUrl succeeds
 * - Otherwise → shortenUrl throws with statusCode 400
 */
describe('Link Manager - Custom Alias Format Validation', () => {
  it('Property 12: valid aliases succeed, invalid aliases throw HTTP 400', async () => {
    const ALIAS_REGEX = /^[a-zA-Z0-9-]{1,50}$/;

    const mockPool = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO tracked_links')) {
          const slug = params[1] as string;
          return {
            rows: [{
              id: '1',
              userId: params[0],
              slug,
              originalUrl: params[2],
              clickCount: 0,
              createdAt: new Date().toISOString(),
            }],
          };
        }
        return { rows: [] };
      },
    } as unknown as Pool;

    const service = createLinkManagerService(mockPool);

    await fc.assert(
      fc.asyncProperty(fc.string(), async (alias: string) => {
        const isValid = ALIAS_REGEX.test(alias);

        if (isValid) {
          const link = await service.shortenUrl('user-1', 'https://example.com', alias);
          expect(link.slug).toBe(alias);
        } else {
          let threw = false;
          try {
            await service.shortenUrl('user-1', 'https://example.com', alias);
          } catch (err: any) {
            threw = true;
            expect(err.statusCode).toBe(400);
          }
          expect(threw).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
