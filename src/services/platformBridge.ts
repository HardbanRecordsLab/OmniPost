import { Post } from '../../types';
import { getAdapter } from '../platforms/adapters/AdapterLoader';

type PublishOutcome = { success: boolean; externalId?: string; error?: string; retry?: { shouldRetry: boolean; delayMs?: number; reason?: string } };
type ValidateOutcome = { valid: boolean; errors?: string[] };

function isImage(url: string) {
  return /\.(jpg|jpeg|png)$/i.test(url);
}

function isVideo(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url);
}

export async function publishWithAdapter(platformId: string, post: Post): Promise<PublishOutcome> {
  const flag = process.env.USE_NEW_PLATFORM_ADAPTERS;
  const enabled = String(flag).toLowerCase() === 'true';
  console.log('[platformBridge.publish] start', { platformId, enabled, hasMedia: !!post.mediaUrls?.length, ts: Date.now() });
  if (!enabled) {
    console.log('[platformBridge.publish] disabled', { platformId });
    return { success: false, error: 'New adapters disabled' };
  }
  const adapter = getAdapter(platformId);
  if (!adapter) {
    console.log('[platformBridge.publish] adapter_missing', { platformId });
    return { success: false, error: 'New adapters disabled' };
  }
  const v = adapter.validateContent(post);
  if (!v.valid) {
    console.log('[platformBridge.publish] validation_failed', { platformId, errors: v.errors });
    return { success: false, error: 'validation_failed' };
  }
  try {
    const res = await adapter.publish(post);
    console.log('[platformBridge.publish] success', { platformId, externalId: res.externalId });
    return { success: true, externalId: res.externalId };
  } catch (err: any) {
    const h = adapter.handleErrors(err, post);
    console.log('[platformBridge.publish] error', { platformId, code: err?.code, message: err?.message, retry: h });
    return { success: false, error: String(err?.message || 'publish_error'), retry: h };
  }
}

export function validateWithAdapter(platformId: string, post: Post): ValidateOutcome {
  const flag = process.env.USE_NEW_PLATFORM_ADAPTERS;
  const enabled = String(flag).toLowerCase() === 'true';
  console.log('[platformBridge.validate] start', { platformId, enabled, ts: Date.now() });
  if (!enabled) {
    console.log('[platformBridge.validate] disabled', { platformId });
    return { valid: false, errors: ['New adapters disabled'] };
  }
  const adapter = getAdapter(platformId);
  if (!adapter) {
    console.log('[platformBridge.validate] adapter_missing', { platformId });
    return { valid: false, errors: ['New adapters disabled'] };
  }
  const base = adapter.validateContent(post);
  const errors: string[] = [];
  if (!base.valid && base.errors?.length) {
    errors.push(...base.errors);
  }
  if (platformId.toLowerCase() === 'instagram') {
    const urls = post.mediaUrls || [];
    const ok = urls.some(u => isImage(u));
    if (!ok) errors.push('media_required_image_jpg_png');
  }
  if (platformId.toLowerCase() === 'tiktok' || platformId.toLowerCase() === 'youtube') {
    const urls = post.mediaUrls || [];
    const ok = urls.some(u => isVideo(u));
    if (!ok) errors.push('media_required_video_mp4_mov_webm');
  }
  const valid = errors.length === 0 && base.valid;
  console.log('[platformBridge.validate] result', { platformId, valid, errors });
  return valid ? { valid: true } : { valid: false, errors };
}

export async function testConnection(platformId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const flag = process.env.USE_NEW_PLATFORM_ADAPTERS;
  const enabled = String(flag).toLowerCase() === 'true';
  console.log('[platformBridge.test] start', { platformId, enabled, ts: Date.now() });
  if (!enabled) return { success: false, error: 'New adapters disabled' };
  const adapter = getAdapter(platformId);
  if (!adapter) return { success: false, error: 'New adapters disabled' };
  const post: Post = {
    id: String(Date.now()),
    content: 'Hello from OmniPost (TEST)',
    status: 'draft' as any,
    scheduledAt: new Date().toISOString(),
    platformIds: [],
    mediaUrls: []
  };
  const v = adapter.validateContent(post);
  if (!v.valid) {
    return { success: false, error: (v.errors || []).join(',') || 'validation_failed' };
  }
  try {
    const r = await adapter.publish(post);
    return { success: true, message: `externalId=${r.externalId}` };
  } catch (e: any) {
    return { success: false, error: String(e?.message || 'test_failed') };
  }
}
