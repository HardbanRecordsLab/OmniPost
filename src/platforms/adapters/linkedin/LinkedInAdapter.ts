import { BaseAdapter, PublishResult, ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';

export class LinkedInAdapter extends BaseAdapter {
  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (post.content.length > 3000) {
      return { valid: false, errors: ['content_too_long'] };
    }
    return { valid: true };
  }

  async publish(post: Post): Promise<PublishResult> {
    const token = process.env.LI_ACCESS_TOKEN || '';
    const url = process.env.LI_API_URL || '';
    if (!token || !url) {
      throw { code: 100, message: 'Missing LI_ACCESS_TOKEN or LI_API_URL' };
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text: post.content, media: post.mediaUrls })
    });
    return { externalId: `li-${Date.now()}` };
  }
}
