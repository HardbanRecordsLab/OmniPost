import { BaseAdapter, PublishResult, ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';

function hasValidImage(urls: string[]) {
  return urls.some(u => /\.(jpg|jpeg|png)$/i.test(u));
}

export class PinterestAdapter extends BaseAdapter {
  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      return { valid: false, errors: ['media_required'] };
    }
    if (!hasValidImage(post.mediaUrls)) {
      return { valid: false, errors: ['invalid_media_format'] };
    }
    return { valid: true };
  }

  async publish(post: Post): Promise<PublishResult> {
    const token = process.env.PIN_ACCESS_TOKEN || '';
    const url = process.env.PIN_API_URL || '';
    if (!token || !url) {
      throw { code: 100, message: 'Missing PIN_ACCESS_TOKEN or PIN_API_URL' };
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ note: post.content, media: post.mediaUrls })
    });
    return { externalId: `pin-${Date.now()}` };
  }
}
