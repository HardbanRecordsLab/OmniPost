import { BaseAdapter, PublishResult, ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';

export class TwitterAdapter extends BaseAdapter {
  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (post.content.length > 280) {
      return { valid: false, errors: ['content_too_long'] };
    }
    return { valid: true };
  }

  async publish(post: Post): Promise<PublishResult> {
    const token = process.env.X_ACCESS_TOKEN || process.env.TW_ACCESS_TOKEN || '';
    const url = process.env.X_API_URL || process.env.TW_API_URL || '';
    if (!token || !url) {
      throw { code: 100, message: 'Missing X/TW token or API URL' };
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text: post.content, media: post.mediaUrls })
    });
    return { externalId: `tw-${Date.now()}` };
  }
}
