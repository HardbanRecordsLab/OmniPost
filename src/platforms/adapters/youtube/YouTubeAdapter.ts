import { BaseAdapter, PublishResult, ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';

function hasValidVideo(urls: string[]) {
  return urls.some(u => /\.(mp4|mov|webm)$/i.test(u));
}

export class YouTubeAdapter extends BaseAdapter {
  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      return { valid: false, errors: ['media_required'] };
    }
    if (!hasValidVideo(post.mediaUrls)) {
      return { valid: false, errors: ['invalid_media_format'] };
    }
    return { valid: true };
  }

  async publish(post: Post): Promise<PublishResult> {
    const token = process.env.YT_ACCESS_TOKEN || '';
    const url = process.env.YT_API_URL || '';
    if (!token || !url) {
      throw { code: 100, message: 'Missing YT_ACCESS_TOKEN or YT_API_URL' };
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ description: post.content, media: post.mediaUrls })
    });
    return { externalId: `yt-${Date.now()}` };
  }
}
