import * as fs from 'fs';
import * as path from 'path';
import { PlatformRegistry, PlatformConfig } from './PlatformRegistry';
import { PlatformAdapter, PublishResult } from './base/PlatformAdapter';
import { RateLimiter } from './base/RateLimiter';
import { SmartLauncherAdapter } from './base/SmartLauncherAdapter';
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
import { InstagramPuppeteerAdapter } from './meta/InstagramPuppeteerAdapter';
import { FacebookPuppeteerAdapter } from './meta/FacebookPuppeteerAdapter';
import { TikTokPuppeteerAdapter } from './tiktok/TikTokPuppeteerAdapter';
import { LinkedInPuppeteerAdapter } from './linkedin/LinkedInPuppeteerAdapter';
import { YouTubePuppeteerAdapter } from './youtube/YouTubePuppeteerAdapter';
import { TwitterPuppeteerAdapter } from './twitter/TwitterPuppeteerAdapter';
import { RedditPuppeteerAdapter } from './others/RedditPuppeteerAdapter';
import { PinterestPuppeteerAdapter } from './others/PinterestPuppeteerAdapter';
import { TelegramPuppeteerAdapter } from './others/TelegramPuppeteerAdapter';
import { DiscordPuppeteerAdapter } from './others/DiscordPuppeteerAdapter';
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
  registry.register('instagram_puppeteer', wrapWithRateLimit('instagram', new InstagramPuppeteerAdapter()));
  registry.register('facebook_puppeteer', wrapWithRateLimit('facebook', new FacebookPuppeteerAdapter()));
  registry.register('tiktok_puppeteer', wrapWithRateLimit('tiktok', new TikTokPuppeteerAdapter()));
  registry.register('linkedin_puppeteer', wrapWithRateLimit('linkedin', new LinkedInPuppeteerAdapter()));
  registry.register('youtube_puppeteer', wrapWithRateLimit('youtube', new YouTubePuppeteerAdapter()));
  registry.register('twitter_puppeteer', wrapWithRateLimit('twitter', new TwitterPuppeteerAdapter()));
  registry.register('reddit_puppeteer', wrapWithRateLimit('reddit', new RedditPuppeteerAdapter()));
  registry.register('pinterest_puppeteer', wrapWithRateLimit('pinterest', new PinterestPuppeteerAdapter()));
  registry.register('telegram_puppeteer', wrapWithRateLimit('telegram', new TelegramPuppeteerAdapter()));
  registry.register('discord_puppeteer', wrapWithRateLimit('discord', new DiscordPuppeteerAdapter()));

  // Register smart_launcher platforms from registry.json
  try {
    const registryJsonPath = path.resolve(__dirname, '../../src/platforms/registry.json');
    const raw = fs.readFileSync(registryJsonPath, 'utf-8');
    const entries: PlatformConfig[] = JSON.parse(raw);
    for (const entry of entries) {
      if (entry.adapterType === 'smart_launcher') {
        registry.register(entry.id, new SmartLauncherAdapter(entry));
      }
    }
  } catch {
    // registry.json is optional; skip on error
  }

  return registry;
}

export function getAdapter(platformId: string): PlatformAdapter | undefined {
  const reg = getRegistry();
  if (!reg) return undefined;
  return reg.get(platformId);
}
