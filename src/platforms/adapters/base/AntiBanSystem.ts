import type { Page } from 'puppeteer';

const USER_AGENTS: string[] = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Brave/1.61',
];

/** Simple sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cubic Bézier interpolation.
 * Returns a point at parameter t (0–1) along the curve defined by p0, p1, p2, p3.
 */
function cubicBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export class AntiBanSystem {
  private redis: any;

  constructor(redis?: any) {
    this.redis = redis ?? null;
  }

  // ---------------------------------------------------------------------------
  // Task 4.1 — human-like interaction helpers
  // ---------------------------------------------------------------------------

  /**
   * Types `text` into `selector` with a randomised per-keystroke delay of 800–4000 ms.
   */
  async humanType(page: Page, selector: string, text: string): Promise<void> {
    await page.focus(selector);
    for (const char of text) {
      const delay = 800 + Math.random() * 3200; // 800–4000 ms
      await page.keyboard.type(char, { delay });
    }
  }

  /**
   * Moves the mouse along a cubic Bézier curve (20 steps) to the centre of
   * the element matched by `selector`, then performs a click.
   */
  async humanClick(page: Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`humanClick: element not found for selector "${selector}"`);
    }

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`humanClick: could not get bounding box for "${selector}"`);
    }

    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;

    // Retrieve current mouse position via evaluate (fallback to 0,0)
    const currentPos = await page.evaluate(() => ({
      x: (window as any).__mouseX ?? 0,
      y: (window as any).__mouseY ?? 0,
    }));

    const startX = currentPos.x;
    const startY = currentPos.y;

    // Random control points for a natural-looking curve
    const cp1x = startX + (targetX - startX) * 0.25 + (Math.random() - 0.5) * 100;
    const cp1y = startY + (targetY - startY) * 0.25 + (Math.random() - 0.5) * 100;
    const cp2x = startX + (targetX - startX) * 0.75 + (Math.random() - 0.5) * 100;
    const cp2y = startY + (targetY - startY) * 0.75 + (Math.random() - 0.5) * 100;

    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = cubicBezier(t, startX, cp1x, cp2x, targetX);
      const y = cubicBezier(t, startY, cp1y, cp2y, targetY);
      await page.mouse.move(x, y);
      await sleep(10 + Math.random() * 20); // small inter-step delay
    }

    await page.click(selector);
  }

  /**
   * Returns a new array that is a Fisher-Yates shuffled copy of `fields`.
   */
  shuffleFieldOrder<T>(fields: T[]): T[] {
    const copy = [...fields];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Returns a random User-Agent string from the built-in pool.
   */
  getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  // ---------------------------------------------------------------------------
  // Task 4.2 — Redis rate window
  // ---------------------------------------------------------------------------

  private redisKey(platform: string, userId: string): string {
    return `anti_ban:${userId}:${platform}`;
  }

  /**
   * Checks whether the user has exceeded 5 publishes in the last 3600 s.
   * Returns 1 800 000 ms (30 min) cool-down if over the limit, otherwise 0.
   * Returns 0 when Redis is not configured.
   */
  async checkCoolDown(platform: string, userId: string): Promise<number> {
    if (!this.redis) return 0;

    const key = this.redisKey(platform, userId);
    const now = Date.now();
    const windowStart = now - 3600 * 1000;

    const count: number = await this.redis.zcount(key, windowStart, '+inf');
    return count > 5 ? 1_800_000 : 0;
  }

  /**
   * Records a publish event in the sorted set and sets a 7200 s TTL.
   * No-op when Redis is not configured.
   */
  async recordPublish(platform: string, userId: string): Promise<void> {
    if (!this.redis) return;

    const key = this.redisKey(platform, userId);
    const now = Date.now();

    await this.redis.zadd(key, now, String(now));
    await this.redis.expire(key, 7200);
  }
}
