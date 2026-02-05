import { PlatformRegistry } from './PlatformRegistry';
import { PlatformAdapter, PublishResult } from './base/PlatformAdapter';
import { RateLimiter } from './base/RateLimiter';
import { InstagramAdapter } from './meta/InstagramAdapter';
import { FacebookAdapter } from './meta/FacebookAdapter';
import { TikTokAdapter } from './tiktok/TikTokAdapter';
import { LinkedInAdapter } from './linkedin/LinkedInAdapter';
import { YouTubeAdapter } from './youtube/YouTubeAdapter';
import { TwitterAdapter } from './twitter/TwitterAdapter';
import { TelegramAdapter } from './others/TelegramAdapter';
import { DiscordAdapter } from './others/DiscordAdapter';
import { RedditAdapter } from './others/RedditAdapter';
import { PinterestAdapter } from './others/PinterestAdapter';
import { BlueskyAdapter } from './others/BlueskyAdapter';
import { Post } from '../../types';

const limits = {
  instagram: { limit: 200, intervalMs: 60 * 60 * 1000 },
  facebook: { limit: 200, intervalMs: 60 * 60 * 1000 },
  tiktok: { limit: 200, intervalMs: 60 * 60 * 1000 },
  linkedin: { limit: 200, intervalMs: 60 * 60 * 1000 },
  youtube: { limit: 200, intervalMs: 60 * 60 * 1000 },
  twitter: { limit: 300, intervalMs: 60 * 60 * 1000 },
  telegram: { limit: 1000, intervalMs: 60 * 60 * 1000 },
  discord: { limit: 1000, intervalMs: 60 * 60 * 1000 },
  reddit: { limit: 300, intervalMs: 60 * 60 * 1000 },
  pinterest: { limit: 300, intervalMs: 60 * 60 * 1000 },
  bluesky: { limit: 300, intervalMs: 60 * 60 * 1000 }
};

const limiter = new RateLimiter(limits);

function wrapWithRateLimit(platformId: string, adapter: PlatformAdapter): PlatformAdapter {
  return {
    validateContent: adapter.validateContent.bind(adapter),
    handleErrors: adapter.handleErrors.bind(adapter),
    async publish(post: Post): Promise<PublishResult> {
      if (!limiter.canProceed(platformId)) {
        const err: any = { code: 368, message: 'rate_limited' };
        throw err;
      }
      const res = await adapter.publish(post);
      limiter.record(platformId);
      return res;
    }
  };
}

export function getRegistry(): PlatformRegistry | undefined {
  const flag = process.env.USE_NEW_PLATFORM_ADAPTERS;
  if (String(flag).toLowerCase() !== 'true') return undefined;
  const registry = new PlatformRegistry();
  registry.register('instagram', wrapWithRateLimit('instagram', new InstagramAdapter()));
  registry.register('facebook', wrapWithRateLimit('facebook', new FacebookAdapter()));
  registry.register('tiktok', wrapWithRateLimit('tiktok', new TikTokAdapter()));
  registry.register('linkedin', wrapWithRateLimit('linkedin', new LinkedInAdapter()));
  registry.register('youtube', wrapWithRateLimit('youtube', new YouTubeAdapter()));
  registry.register('twitter', wrapWithRateLimit('twitter', new TwitterAdapter()));
  registry.register('telegram', wrapWithRateLimit('telegram', new TelegramAdapter()));
  registry.register('discord', wrapWithRateLimit('discord', new DiscordAdapter()));
  registry.register('reddit', wrapWithRateLimit('reddit', new RedditAdapter()));
  registry.register('pinterest', wrapWithRateLimit('pinterest', new PinterestAdapter()));
  registry.register('bluesky', wrapWithRateLimit('bluesky', new BlueskyAdapter()));
  return registry;
}

export function getAdapter(platformId: string): PlatformAdapter | undefined {
  const reg = getRegistry();
  if (!reg) return undefined;
  return reg.get(platformId);
}
