import { BaseAdapter, PublishResult, ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';

function hasValidImage(urls: string[]) {
  return urls.some(u => /\.(jpg|jpeg|png)$/i.test(u));
}

export class InstagramAdapter extends BaseAdapter {
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

  async publish(post: Post): Promise<PublishResult> {
    const token = process.env.IG_ACCESS_TOKEN || '';
    const url = process.env.IG_API_URL || '';
    if (!token || !url) {
      throw { code: 100, message: 'Missing IG_ACCESS_TOKEN or IG_API_URL' };
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ caption: post.content, media: post.mediaUrls })
    });
    return { externalId: `ig-${Date.now()}` };
  }
}
