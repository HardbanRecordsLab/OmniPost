import puppeteer, { Browser, Page } from 'puppeteer';
import { BaseAdapter, PublishResult } from './PlatformAdapter';
import { AntiBanSystem } from './AntiBanSystem';
import { CookieEntry } from '../../../backend/src/services/session-vault.service';
import { Post } from '../../../types';

export abstract class PuppeteerAdapter extends BaseAdapter {
  protected antiBan: AntiBanSystem;
  protected cookies: CookieEntry[] | null = null;

  constructor(antiBan: AntiBanSystem) {
    super();
    this.antiBan = antiBan;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  setCookies(cookies: CookieEntry[]): void {
    this.cookies = cookies;
  }

  async publish(post: Post): Promise<PublishResult> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Set a random user agent to reduce bot-detection risk
      await page.setUserAgent(this.antiBan.getRandomUserAgent());

      // Restore cookies if available
      if (this.cookies) {
        await this.restoreCookies(page, this.cookies);
      }

      await this.navigateToPostPage(page);

      const challenged = await this.detectLoginChallenge(page);
      if (challenged) {
        throw new Error('login_challenge_detected');
      }

      await this.fillPostContent(page, post);

      const { postId, postUrl } = await this.submitPost(page);

      return { externalId: postId };
    } finally {
      await this.closeBrowser(browser);
    }
  }

  // ── Abstract methods (subclasses must implement) ────────────────────────────

  protected abstract navigateToPostPage(page: Page): Promise<void>;
  protected abstract fillPostContent(page: Page, post: Post): Promise<void>;
  protected abstract submitPost(page: Page): Promise<{ postId: string; postUrl: string }>;
  protected abstract detectLoginChallenge(page: Page): Promise<boolean>;

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async restoreCookies(page: Page, cookies: CookieEntry[]): Promise<void> {
    await page.setCookie(...cookies);
  }

  private async closeBrowser(browser: Browser): Promise<void> {
    await Promise.race([
      browser.close(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30000)
      ),
    ]);
  }
}
