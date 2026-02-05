import { BaseAdapter, PublishResult, ValidationResult } from '../base/PlatformAdapter';
import { Post } from '../../../types';

export class DiscordAdapter extends BaseAdapter {
  validateContent(post: Post): ValidationResult {
    const base = super.validateContent(post);
    if (!base.valid) return base;
    if (post.content.length > 2000) {
      return { valid: false, errors: ['content_too_long'] };
    }
    return { valid: true };
  }

  async publish(post: Post): Promise<PublishResult> {
    const url = process.env.DISCORD_WEBHOOK_URL || '';
    if (!url) {
      throw { code: 100, message: 'Missing DISCORD_WEBHOOK_URL' };
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: post.content })
    });
    return { externalId: `dc-${Date.now()}` };
  }
}
