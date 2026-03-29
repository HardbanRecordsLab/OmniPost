// Feature: social-command-center-pro, Property 3: Platform Config Validation Invariant

import * as fc from 'fast-check';
import { PlatformRegistry, PlatformConfig } from '../../src/platforms/adapters/PlatformRegistry';

/**
 * Property 3: Platform Config Validation Invariant
 * Validates: Requirements 2.4
 *
 * For any config where at least one of `id`, `displayName`, or `baseUrl` is
 * empty string or missing, `validateConfig` must return `{ valid: false }`.
 */
describe('PlatformRegistry - Platform Config Validation Invariant', () => {
  const registry = new PlatformRegistry();

  // Arbitrary for the enum fields
  const adapterTypeArb = fc.constantFrom<'puppeteer' | 'smart_launcher'>('puppeteer', 'smart_launcher');
  const toneCategoryArb = fc.constantFrom<'professional' | 'casual' | 'provocative' | 'crypto' | 'forum' | 'short_form'>(
    'professional', 'casual', 'provocative', 'crypto', 'forum', 'short_form'
  );
  const categoryArb = fc.constantFrom<'standard_social' | 'adult' | 'crypto_nostr' | 'forums' | 'creator_economy'>(
    'standard_social', 'adult', 'crypto_nostr', 'forums', 'creator_economy'
  );

  // Arbitrary for a valid base config (all required fields non-empty)
  const validBaseConfigArb = fc.record<PlatformConfig>({
    id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
    displayName: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
    baseUrl: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
    loginUrl: fc.string(),
    postUrl: fc.string(),
    adapterType: adapterTypeArb,
    toneCategory: toneCategoryArb,
    category: categoryArb,
    supportsHashtags: fc.boolean(),
  });

  it('Property 3: config with empty id returns valid: false', () => {
    fc.assert(
      fc.property(validBaseConfigArb, (base) => {
        const config: PlatformConfig = { ...base, id: '' };
        const result = registry.validateConfig(config);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: config with empty displayName returns valid: false', () => {
    fc.assert(
      fc.property(validBaseConfigArb, (base) => {
        const config: PlatformConfig = { ...base, displayName: '' };
        const result = registry.validateConfig(config);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: config with empty baseUrl returns valid: false', () => {
    fc.assert(
      fc.property(validBaseConfigArb, (base) => {
        const config: PlatformConfig = { ...base, baseUrl: '' };
        const result = registry.validateConfig(config);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
