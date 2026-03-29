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

const adapters = [
  { id: 'instagram', inst: new InstagramAdapter(), post: { mediaUrls: ['https://example.com/a.jpg'] } },
  { id: 'facebook', inst: new FacebookAdapter(), post: {} },
  { id: 'tiktok', inst: new TikTokAdapter(), post: { mediaUrls: ['https://example.com/a.mp4'] } },
  { id: 'linkedin', inst: new LinkedInAdapter(), post: {} },
  { id: 'youtube', inst: new YouTubeAdapter(), post: { mediaUrls: ['https://example.com/a.mp4'] } },
  { id: 'twitter', inst: new TwitterAdapter(), post: {} },
  { id: 'telegram', inst: new TelegramAdapter(), post: {} },
  { id: 'discord', inst: new DiscordAdapter(), post: {} },
  { id: 'reddit', inst: new RedditAdapter(), post: {} },
  { id: 'pinterest', inst: new PinterestAdapter(), post: { mediaUrls: ['https://example.com/a.png'] } },
  { id: 'bluesky', inst: new BlueskyAdapter(), post: {} }
];

const basePost: Post = {
  id: 'test',
  content: 'Test content',
  status: PostStatus.DRAFT,
  scheduledAt: new Date().toISOString(),
  platformIds: [],
  mediaUrls: []
};

globalThis.fetch = async () => ({ ok: true }) as any;

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

async function run() {
  let passed = 0;
  let failed = 0;
  for (const a of adapters) {
    const p: Post = { ...basePost, mediaUrls: a.post.mediaUrls || [] };
    const v = a.inst.validateContent(p);
    if (!v.valid) {
      console.log(`VALIDATION_FAIL ${a.id}:`, v.errors);
      failed++;
      continue;
    }
    try {
      const r = await a.inst.publish(p);
      if (!r.externalId) {
        console.log(`PUBLISH_FAIL ${a.id}: no externalId`);
        failed++;
      } else {
        console.log(`OK ${a.id}: ${r.externalId}`);
        passed++;
      }
    } catch (e: any) {
      console.log(`PUBLISH_ERROR ${a.id}:`, e?.message || String(e));
      failed++;
    }
  }
  console.log(`RESULT passed=${passed} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

run();
