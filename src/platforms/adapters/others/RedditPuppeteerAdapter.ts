import { PuppeteerAdapter } from '../base/PuppeteerAdapter';
import { AntiBanSystem } from '../base/AntiBanSystem';
import { ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';
import type { Page } from 'puppeteer';

export class RedditPuppeteerAdapter extends PuppeteerAdapter {
  constructor() {
    super(new AntiBanSystem());
  }

  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (post.content.length > 40000) {
      return { valid: false, errors: ['content_too_long'] };
    }
    return { valid: true };
  }

  protected async navigateToPostPage(page: Page): Promise<void> {
    await page.goto('https://www.reddit.com/submit', { waitUntil: 'networkidle2' });
  }

  protected async detectLoginChallenge(page: Page): Promise<boolean> {
    const el = await page.$('input[name="username"]');
    return el !== null;
  }

  protected async fillPostContent(page: Page, post: Post): Promise<void> {
    await this.antiBan.humanType(page, 'div[data-testid="post-content"]', post.content);
  }

  protected async submitPost(page: Page): Promise<{ postId: string; postUrl: string }> {
    await page.click('button[data-testid="post-submit-button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    return { postId: `puppeteer-${Date.now()}`, postUrl: page.url() };
  }
}
