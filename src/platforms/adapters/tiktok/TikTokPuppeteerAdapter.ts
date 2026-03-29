import { PuppeteerAdapter } from '../base/PuppeteerAdapter';
import { AntiBanSystem } from '../base/AntiBanSystem';
import { ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';
import type { Page } from 'puppeteer';

function hasValidVideo(urls: string[]) {
  return urls.some(u => /\.(mp4|mov|webm)$/i.test(u));
}

export class TikTokPuppeteerAdapter extends PuppeteerAdapter {
  constructor() {
    super(new AntiBanSystem());
  }

  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      return { valid: false, errors: ['media_required'] };
    }
    if (!hasValidVideo(post.mediaUrls)) {
      return { valid: false, errors: ['invalid_media_format'] };
    }
    if (post.content.length > 4000) {
      return { valid: false, errors: ['content_too_long'] };
    }
    return { valid: true };
  }

  protected async navigateToPostPage(page: Page): Promise<void> {
    await page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle2' });
  }

  protected async detectLoginChallenge(page: Page): Promise<boolean> {
    const el = await page.$('input[name="username"]');
    return el !== null;
  }

  protected async fillPostContent(page: Page, post: Post): Promise<void> {
    await this.antiBan.humanType(page, 'div[contenteditable="true"]', post.content);
  }

  protected async submitPost(page: Page): Promise<{ postId: string; postUrl: string }> {
    await page.click('button[data-e2e="upload-btn"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    return { postId: `puppeteer-${Date.now()}`, postUrl: page.url() };
  }
}
