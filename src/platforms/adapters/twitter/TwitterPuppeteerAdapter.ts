import { PuppeteerAdapter } from '../base/PuppeteerAdapter';
import { AntiBanSystem } from '../base/AntiBanSystem';
import { ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';
import type { Page } from 'puppeteer';

export class TwitterPuppeteerAdapter extends PuppeteerAdapter {
  constructor() {
    super(new AntiBanSystem());
  }

  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (post.content.length > 280) {
      return { valid: false, errors: ['content_too_long'] };
    }
    return { valid: true };
  }

  protected async navigateToPostPage(page: Page): Promise<void> {
    await page.goto('https://twitter.com/compose/tweet', { waitUntil: 'networkidle2' });
  }

  protected async detectLoginChallenge(page: Page): Promise<boolean> {
    const el = await page.$('input[name="text"]');
    return el !== null;
  }

  protected async fillPostContent(page: Page, post: Post): Promise<void> {
    await this.antiBan.humanType(page, 'div[data-testid="tweetTextarea_0"]', post.content);
  }

  protected async submitPost(page: Page): Promise<{ postId: string; postUrl: string }> {
    await page.click('button[data-testid="tweetButtonInline"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    return { postId: `puppeteer-${Date.now()}`, postUrl: page.url() };
  }
}
