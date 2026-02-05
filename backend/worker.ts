
import type { Post } from '../types';
import { queries } from './db';

// --- Worker Logic ---

export async function processPost(post: Post) {

  const flag = String(process.env.USE_NEW_PLATFORM_ADAPTERS || '').toLowerCase() === 'true';
  const platformId = (post.platformId || (post.platformIds && post.platformIds[0]) || 'generic').toLowerCase();

  if (flag) {
    const LoaderMod = await import('../src/platforms/adapters/AdapterLoader');
    const getAdapterFn: any = (LoaderMod as any).getAdapter || ((LoaderMod as any).default && (LoaderMod as any).default.getAdapter);
    const adapter = getAdapterFn ? getAdapterFn(platformId) : undefined;
    if (!adapter) {
      const { pushLog } = await import('./logs');
      pushLog({ ts: Date.now(), platformId, postId: post.id, event: 'adapter_missing' })
      const currentRetry = post.retry_count || 0;
      const maxRetries = 3;
      if (currentRetry < maxRetries) {
        const base = 15000;
        const delay = Math.min(300000, Math.pow(2, currentRetry) * base) + Math.floor(Math.random() * 5000);
        const scheduledAt = new Date(Date.now() + delay).toISOString();
        queries.updatePostRetry.run({
          lastError: 'adapter_missing',
          retryCount: currentRetry + 1,
          scheduledAt,
          id: post.id
        });
      } else {
        queries.updatePostStatus.run({
          status: 'failed',
          lastError: 'adapter_missing',
          retryCount: currentRetry + 1,
          id: post.id
        });
      }
      return;
    }

    const normalized: Post = {
      ...post,
      platformIds: post.platformIds || (post.platformId ? [post.platformId] : []),
      mediaUrls: post.mediaUrls || (post.media_url ? [post.media_url] : [])
    };
    const v = adapter.validateContent(normalized);
    if (!v.valid) {
      const { pushLog } = await import('./logs');
      pushLog({ ts: Date.now(), platformId, postId: post.id, event: 'validation_failed', message: (v.errors || []).join(',') })
      const currentRetry = post.retry_count || 0;
      const maxRetries = 3;
      if (currentRetry < maxRetries) {
        const base = 15000;
        const delay = Math.min(300000, Math.pow(2, currentRetry) * base) + Math.floor(Math.random() * 5000);
        const scheduledAt = new Date(Date.now() + delay).toISOString();
        queries.updatePostRetry.run({
          lastError: (v.errors || []).join(',') || 'validation_failed',
          retryCount: currentRetry + 1,
          scheduledAt,
          id: post.id
        });
      } else {
        queries.updatePostStatus.run({
          status: 'failed',
          lastError: (v.errors || []).join(',') || 'validation_failed',
          retryCount: currentRetry + 1,
          id: post.id
        });
      }
      return;
    }

    try {
      const res = await adapter.publish(normalized);
      const { pushLog } = await import('./logs');
      pushLog({ ts: Date.now(), platformId, postId: post.id, event: 'publish_success', message: res.externalId })
      queries.updatePostStatus.run({
        status: 'published',
        lastError: null,
        retryCount: post.retry_count || 0,
        id: post.id
      });
    } catch (err: any) {
      const h = adapter.handleErrors(err, normalized);
      const { pushLog } = await import('./logs');
      pushLog({ ts: Date.now(), platformId, postId: post.id, event: 'publish_error', message: String(err?.message || ''), retryCount: (post.retry_count || 0) + 1 })
      const currentRetry = post.retry_count || 0;
      const maxRetries = 3;
      const shouldRetry = !!h.shouldRetry;
      if (shouldRetry && currentRetry < maxRetries) {
        const base = 15000;
        const delay = Math.min(300000, Math.pow(2, currentRetry) * base) + Math.floor(Math.random() * 5000);
        const scheduledAt = new Date(Date.now() + delay).toISOString();
        queries.updatePostRetry.run({
          lastError: h.reason || err?.message || 'publish_error',
          retryCount: currentRetry + 1,
          scheduledAt,
          id: post.id
        });
      } else {
        queries.updatePostStatus.run({
          status: 'failed',
          lastError: h.reason || err?.message || 'publish_error',
          retryCount: currentRetry + 1,
          id: post.id
        });
      }
    }
    return;
  }

  // Fallback legacy behavior (mock adapters)
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    queries.updatePostStatus.run({
      status: 'published',
      lastError: null,
      retryCount: post.retry_count || 0,
      id: post.id
    });
  } catch (err) {
    const currentRetry = post.retry_count || 0;
    const maxRetries = 3;
    const message = (err as Error)?.message || 'publish_error';
    if (currentRetry < maxRetries) {
      const base = 15000;
      const delay = Math.min(300000, Math.pow(2, currentRetry) * base) + Math.floor(Math.random() * 5000);
      const scheduledAt = new Date(Date.now() + delay).toISOString();
      queries.updatePostRetry.run({
        lastError: message,
        retryCount: currentRetry + 1,
        scheduledAt,
        id: post.id
      });
    } else {
      queries.updatePostStatus.run({
        status: 'failed',
        lastError: message,
        retryCount: currentRetry + 1,
        id: post.id
      });
    }
  }
}
