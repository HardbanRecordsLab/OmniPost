import { PuppeteerAdapter } from '../base/PuppeteerAdapter';
import { AntiBanSystem } from '../base/AntiBanSystem';
import { ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';
import type { Page } from 'puppeteer';

export class LinkedInPuppeteerAdapter extends PuppeteerAdapter {
  constructor() {
    super(new AntiBanSystem());
  }

  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (post.content.length > 3000) {
      return { valid: false, errors: ['content_too_long'] };
    }
    return { valid: true };
  }

  protected async navigateToPostPage(page: Page): Promise<void> {
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2' });
  }

  protected async detectLoginChallenge(page: Page): Promise<boolean> {
    const el = await page.$('input[name="session_key"]');
    return el !== null;
  }

  protected async fillPostContent(page: Page, post: Post): Promise<void> {
    await this.antiBan.humanType(page, 'div.ql-editor', post.content);
  }

  protected async submitPost(page: Page): Promise<{ postId: string; postUrl: string }> {
    await page.click('button.share-actions__primary-action');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    return { postId: `puppeteer-${Date.now()}`, postUrl: page.url() };
  }
}
