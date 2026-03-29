// Feature: social-command-center-pro, Property 8: Adapter Interface Invariant

import { describe, it, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { expect } from 'vitest';
import { Post, PostStatus } from '../../types';
import { InstagramAdapter } from '../../src/platforms/adapters/meta/InstagramAdapter';
import { FacebookAdapter } from '../../src/platforms/adapters/meta/FacebookAdapter';
import { TikTokAdapter } from '../../src/platforms/adapters/tiktok/TikTokAdapter';
import { LinkedInAdapter } from '../../src/platforms/adapters/linkedin/LinkedInAdapter';
import { YouTubeAdapter } from '../../src/platforms/adapters/youtube/YouTubeAdapter';
import { TwitterAdapter } from '../../src/platforms/adapters/twitter/TwitterAdapter';
import { TelegramAdapter } from '../../src/platforms/adapters/others/TelegramAdapter';
import { DiscordAdapter } from '../../src/platforms/adapters/others/DiscordAdapter';
import { RedditAdapter } from '../../src/platforms/adapters/others/RedditAdapter';
import { PinterestAdapter } from '../../src/platforms/adapters/others/PinterestAdapter';
import { BlueskyAdapter } from '../../src/platforms/adapters/others/BlueskyAdapter';

beforeAll(() => {
  process.env.TELEGRAM_WEBHOOK_URL = 'http://localhost/mock';
  process.env.DISCORD_WEBHOOK_URL = 'http://localhost/mock';
  process.env.IG_ACCESS_TOKEN = 'token';
  process.env.IG_API_URL = 'http://localhost/mock';
  process.env.FB_ACCESS_TOKEN = 'token';
  process.env.FB_API_URL = 'http://localhost/mock';
  process.env.TIKTOK_ACCESS_TOKEN = 'token';
  process.env.TIKTOK_API_URL = 'http://localhost/mock';
  process.env.LI_ACCESS_TOKEN = 'token';
  process.env.LI_API_URL = 'http://localhost/mock';
  process.env.YT_ACCESS_TOKEN = 'token';
  process.env.YT_API_URL = 'http://localhost/mock';
  process.env.X_ACCESS_TOKEN = 'token';
  process.env.X_API_URL = 'http://localhost/mock';
  process.env.PIN_ACCESS_TOKEN = 'token';
  process.env.PIN_API_URL = 'http://localhost/mock';
  process.env.REDDIT_ACCESS_TOKEN = 'token';
  process.env.REDDIT_API_URL = 'http://localhost/mock';
  process.env.BSKY_ACCESS_TOKEN = 'token';
  process.env.BSKY_API_URL = 'http://localhost/mock';
});

const adapters = [
  { id: 'instagram', inst: new InstagramAdapter() },
  { id: 'facebook', inst: new FacebookAdapter() },
  { id: 'tiktok', inst: new TikTokAdapter() },
  { id: 'linkedin', inst: new LinkedInAdapter() },
  { id: 'youtube', inst: new YouTubeAdapter() },
  { id: 'twitter', inst: new TwitterAdapter() },
  { id: 'telegram', inst: new TelegramAdapter() },
  { id: 'discord', inst: new DiscordAdapter() },
  { id: 'reddit', inst: new RedditAdapter() },
  { id: 'pinterest', inst: new PinterestAdapter() },
  { id: 'bluesky', inst: new BlueskyAdapter() },
];

const basePost: Post = {
  id: 'test',
  content: '',
  status: PostStatus.DRAFT,
  scheduledAt: new Date().toISOString(),
  platformIds: [],
  mediaUrls: [],
};

describe('Property 8: Adapter Interface Invariant', () => {
  /**
   * **Validates: Requirements 15.4**
   *
   * For any whitespace-only content string, every registered adapter's
   * validateContent must return { valid: false }.
   */
  it('validateContent returns { valid: false } for whitespace-only content across all adapters', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 }),
        (whitespaceContent) => {
          const post: Post = { ...basePost, content: whitespaceContent };
          for (const adapter of adapters) {
            const result = adapter.inst.validateContent(post);
            if (result.valid !== false) {
              return false;
            }
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
