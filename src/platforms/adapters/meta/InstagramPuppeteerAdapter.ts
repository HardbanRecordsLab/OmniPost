import { PuppeteerAdapter } from '../base/PuppeteerAdapter';
import { AntiBanSystem } from '../base/AntiBanSystem';
import { ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';
import type { Page } from 'puppeteer';

function hasValidImage(urls: string[]) {
  return urls.some(u => /\.(jpg|jpeg|png)$/i.test(u));
}

export class InstagramPuppeteerAdapter extends PuppeteerAdapter {
  constructor() {
    super(new AntiBanSystem());
  }

  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      return { valid: false, errors: ['media_required'] };
    }
    if (!hasValidImage(post.mediaUrls)) {
      return { valid: false, errors: ['invalid_media_format'] };
    }
    if (post.content.length > 2200) {
      return { valid: false, errors: ['content_too_long'] };
    }
    return { valid: true };
  }

  protected async navigateToPostPage(page: Page): Promise<void> {
    await page.goto('https://www.instagram.com/create/style/', { waitUntil: 'networkidle2' });
  }

  protected async detectLoginChallenge(page: Page): Promise<boolean> {
    const el = await page.$('input[name="username"]');
    return el !== null;
  }

  protected async fillPostContent(page: Page, post: Post): Promise<void> {
    await this.antiBan.humanType(page, 'textarea[aria-label]', post.content);
  }

  protected async submitPost(page: Page): Promise<{ postId: string; postUrl: string }> {
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    return { postId: `puppeteer-${Date.now()}`, postUrl: page.url() };
  }
}
