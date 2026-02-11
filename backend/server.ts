import dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initDb, queries } from './db';
import { startScheduler } from './scheduler';
import { randomUUID } from 'crypto';

const fastify = Fastify({ logger: { level: 'warn' } });
const API_KEY = process.env.API_KEY || '';

// Initialize Database
initDb();

startScheduler();

// Register Middleware
fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow all origins (reflection) for Vercel compatibility
    cb(null, true);
  },
  credentials: true
});

// Simple API key protection for sensitive endpoints (no-op if API_KEY is unset)
const requireApiKey = async (request: any, reply: any) => {
  if (!API_KEY) return;
  const h = String(request.headers['x-api-key'] || request.headers['authorization'] || '');
  const token = h.startsWith('Bearer ') ? h.slice(7) : h;
  if (!token || token !== API_KEY) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
};
const requireLicense = async (_request: any, reply: any) => {
  const active = await queries.getActiveLicense.get() as any;
  if (!active) {
    return reply.status(402).send({ error: 'payment_required' });
  }
};

// --- v6 API ---

// --- Routes ---

// Health Check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// GET Posts (scheduled + draft)
fastify.get('/api/posts', async () => {
  const rows = await queries.getAllPostsV6.all() as any[];
  return rows.map(r => ({
    ...r,
    platformIds: r.platformIds
      ? (String(r.platformIds).trim().startsWith('[')
          ? JSON.parse(String(r.platformIds).replace(/'/g, '\"'))
          : String(r.platformIds).split(',').filter(Boolean))
      : [],
    mediaUrls: r.mediaUrls
      ? (String(r.mediaUrls).trim().startsWith('[')
          ? JSON.parse(String(r.mediaUrls).replace(/'/g, '\"'))
          : String(r.mediaUrls).split(',').filter(Boolean))
      : []
  }));
});

// POST Create Post
fastify.post<{ Body: { content: string; scheduledAt?: string; status?: string; platformIds?: string[]; mediaUrls?: string[] } }>('/api/posts', { preHandler: requireLicense }, async (request, reply) => {
  const { content, scheduledAt, status = 'draft', platformIds = [], mediaUrls = [] } = request.body;
  if (!content) return reply.status(400).send({ error: 'content is required' });
  const post = {
    id: randomUUID(),
    content,
    scheduledAt: scheduledAt || null,
    status,
    platformIds: platformIds.join(','),
    mediaUrls: mediaUrls.join(',')
  };
  try {
    await queries.insertPostV6.run(post);
    return { success: true, post: { ...post, platformIds, mediaUrls } };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to create post' });
  }
});

// DELETE Post
fastify.delete<{ Params: { id: string } }>('/api/posts/:id', { preHandler: requireLicense }, async (request, reply) => {
  const { id } = request.params;
  const result = await queries.deletePost.run(id);
  
  if (result.changes === 0) {
    reply.status(404).send({ error: 'Post not found' });
  } else {
    return { success: true, id };
  }
});

// UPDATE Post
fastify.put<{ Params: { id: string }, Body: any }>('/api/posts/:id', { preHandler: requireLicense }, async (request, reply) => {
  const { id } = request.params;
  const data = request.body;
  
  // Get existing post to merge if needed, or just require all fields. 
  // For simplicity, let's assume the client sends the full updated object or we only update specific fields.
  // queries.updatePost requires: content, scheduledAt, status, id
  
  try {
    const existing = await queries.getPostById.get(id) as any;
    if (!existing) {
      return reply.status(404).send({ error: 'Post not found' });
    }
    // Enforce publish windows if scheduledAt provided
    const windows = await queries.getAllWindows.all() as Array<{ platformId: string; startHour: number; endHour: number; enabled: number }>;
    const windowsMap = new Map(windows.map(w => [w.platformId, w]));
    const getPlatformList = (): string[] => {
      if (Array.isArray(data.platformIds)) return data.platformIds as string[];
      const raw = existing.platform_ids || '';
      if (!raw) return existing.platformId ? [existing.platformId] : [];
      const s = String(raw).trim();
      if (s.startsWith('[')) {
        try { return JSON.parse(s.replace(/'/g, '"')); } catch { return []; }
      }
      return s.split(',').filter(Boolean);
    };
    const platforms = getPlatformList();
    if (data.scheduledAt) {
      const dt = new Date(data.scheduledAt);
      const minutesOfDay = dt.getHours() * 60 + dt.getMinutes();
      for (const p of platforms) {
        const w = windowsMap.get(p);
        if (w && w.enabled) {
          const start = (w.startHour || 0) * 60;
          const end = (w.endHour || 23) * 60;
          if (!(minutesOfDay >= start && minutesOfDay <= end)) {
            return reply.status(422).send({ error: 'outside_window', platformId: p });
          }
          const gap = Number((w as any).minGapMinutes || 0);
          if (gap > 0) {
            const startRange = new Date(dt.getTime() - gap * 60000).toISOString();
            const endRange = new Date(dt.getTime() + gap * 60000).toISOString();
            const overlapCountRow = await queries.countOverlapPosts.get({ id, startRange, endRange, platformId: p }) as { count: number };
            if (overlapCountRow.count > 0) {
              return reply.status(422).send({ error: 'min_gap_violation', platformId: p, minGapMinutes: gap });
            }
          }
        }
      }
    }
    const hasPlatforms = Array.isArray(data.platformIds);
    if (hasPlatforms) {
      const updatedV6 = {
        id,
        content: data.content || existing.content,
        scheduledAt: data.scheduledAt || existing.scheduled_at,
        status: data.status || existing.status,
        platformIds: (data.platformIds as string[]).join(',')
      };
      await queries.updatePostV6.run(updatedV6);
      return { success: true, post: { ...updatedV6, platformIds: data.platformIds } };
    } else {
      const updated = {
        id,
        content: data.content || existing.content,
        scheduledAt: data.scheduledAt || existing.scheduled_at,
        status: data.status || existing.status
      };
      await queries.updatePost.run(updated);
      return { success: true, post: updated };
    }
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to update post' });
  }
});

// GET Platforms
fastify.get('/api/platforms', async () => {
  const rows = await queries.getPlatformsV6.all() as any[];
  if (rows.length > 0) return rows;
  return [
    { id: 'instagram', name: 'Instagram', status: 'disabled', accountInfo: '' },
    { id: 'facebook', name: 'Facebook', status: 'disabled', accountInfo: '' },
    { id: 'twitter', name: 'Twitter (X)', status: 'disabled', accountInfo: '' },
    { id: 'linkedin', name: 'LinkedIn', status: 'disabled', accountInfo: '' },
    { id: 'tiktok', name: 'TikTok', status: 'disabled', accountInfo: '' },
    { id: 'youtube', name: 'YouTube', status: 'disabled', accountInfo: '' },
    { id: 'telegram', name: 'Telegram', status: 'disabled', accountInfo: '' },
    { id: 'discord', name: 'Discord', status: 'disabled', accountInfo: '' },
    { id: 'reddit', name: 'Reddit', status: 'disabled', accountInfo: '' },
    { id: 'pinterest', name: 'Pinterest', status: 'disabled', accountInfo: '' },
    { id: 'bluesky', name: 'Bluesky', status: 'disabled', accountInfo: '' },
  ];
});

// Publish Windows API
fastify.get('/api/windows', async () => {
  return await queries.getAllWindows.all();
});

fastify.post<{ Body: { platformId: string; startHour: number; endHour: number; enabled?: number; minGapMinutes?: number } }>('/api/windows', { preHandler: requireApiKey }, async (request, reply) => {
  const { platformId, startHour, endHour, enabled = 1, minGapMinutes = 0 } = request.body;
  if (!platformId || startHour === undefined || endHour === undefined) {
    return reply.status(400).send({ error: 'platformId, startHour, endHour required' });
  }
  try {
    await queries.upsertWindow.run({ platformId, startHour, endHour, enabled, minGapMinutes });
    return { success: true };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to upsert window' });
  }
});

// Subscription/License API
fastify.get('/api/plans', async () => {
  return await queries.getPlans.all();
});
fastify.get('/api/license/status', async () => {
  const row = await queries.getActiveLicense.get() as any;
  return row || null;
});
fastify.post<{ Body: { months?: number; planId?: string } }>('/api/license/trial', async (request) => {
  const { months = 0, planId = 'basic-monthly' } = request.body || {};
  const active = await queries.getActiveLicense.get() as any;
  if (active) return { success: true, license: active };
  const until = new Date(Date.now() + (months > 0 ? months * 30 * 24 * 3600 * 1000 : 14 * 24 * 3600 * 1000)).toISOString();
  await queries.createLicense.run({ key: 'trial', status: 'active', validUntil: until, planId });
  const row = await queries.getActiveLicense.get() as any;
  return { success: true, license: row };
});
fastify.post<{ Body: { key: string; months?: number; planId?: string } }>('/api/license/activate', async (request, reply) => {
  const { key, months = 1, planId = 'basic-monthly' } = request.body || {};
  if (!key) return reply.status(400).send({ error: 'key required' });
  const until = new Date(Date.now() + months * 30 * 24 * 3600 * 1000).toISOString();
  try {
    const existing = await queries.getLicenseByKey.get(key) as any;
    if (existing) {
      await queries.setLicenseStatus.run({ key, status: 'active' });
      return { success: true };
    }
    await queries.createLicense.run({ key, status: 'active', validUntil: until, planId });
    return { success: true };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to activate' });
  }
});

// Batch endpoints
fastify.patch<{ Body: { ids: string[]; setPlatformIds?: string[]; shiftByMinutes?: number; setScheduledAt?: string } }>('/api/posts/batch', { preHandler: [requireApiKey, requireLicense] }, async (request, reply) => {
  const { ids = [], setPlatformIds, shiftByMinutes, setScheduledAt } = request.body;
  if (!Array.isArray(ids) || ids.length === 0) return reply.status(400).send({ error: 'ids required' });
  const windows = await queries.getAllWindows.all() as Array<{ platformId: string; startHour: number; endHour: number; enabled: number; minGapMinutes?: number }>;
  const windowsMap = new Map(windows.map(w => [w.platformId, w]));
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      const existing = await queries.getPostById.get(id) as any;
      if (!existing) { results.push({ id, ok: false, error: 'not_found' }); continue; }
      let scheduledAt = existing.scheduled_at as string | null;
      if (typeof setScheduledAt === 'string') scheduledAt = setScheduledAt;
      if (typeof shiftByMinutes === 'number' && scheduledAt) {
        const d = new Date(scheduledAt); d.setMinutes(d.getMinutes() + shiftByMinutes); scheduledAt = d.toISOString();
      }
      const platformIds = Array.isArray(setPlatformIds)
        ? setPlatformIds
        : (() => {
            const raw = existing.platform_ids || '';
            const s = String(raw).trim();
            if (s.startsWith('[')) { try { return JSON.parse(s.replace(/'/g,'"')); } catch { return []; } }
            return s ? s.split(',').filter(Boolean) : (existing.platform_id ? [existing.platform_id] : []);
          })();
      if (scheduledAt) {
        const dt = new Date(scheduledAt);
        const minutesOfDay = dt.getHours() * 60 + dt.getMinutes();
        for (const p of platformIds) {
          const w = windowsMap.get(p);
          if (w && w.enabled) {
            const start = (w.startHour || 0) * 60;
            const end = (w.endHour || 23) * 60;
            if (!(minutesOfDay >= start && minutesOfDay <= end)) throw new Error('outside_window');
          }
        }
      }
      const payload = {
        id,
        content: existing.content,
        scheduledAt: scheduledAt || existing.scheduled_at,
        status: existing.status,
        platformIds: platformIds.join(',')
      };
      await queries.updatePostV6.run(payload);
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, error: String((err as any)?.message || 'error') });
    }
  }
  return { results };
});

fastify.delete<{ Body: { ids: string[] } }>('/api/posts/batch', { preHandler: [requireApiKey, requireLicense] }, async (request, reply) => {
  const { ids = [] } = request.body;
  if (!Array.isArray(ids) || ids.length === 0) return reply.status(400).send({ error: 'ids required' });
  const results: Array<{ id: string; ok: boolean }> = [];
  for (const id of ids) {
    try {
      await queries.deletePost.run(id);
      results.push({ id, ok: true });
    } catch {
      results.push({ id, ok: false });
    }
  }
  return { results };
});

fastify.put<{ Params: { platformId: string }, Body: { startHour: number; endHour: number; enabled?: number; minGapMinutes?: number } }>('/api/windows/:platformId', { preHandler: requireApiKey }, async (request, reply) => {
  const { platformId } = request.params;
  const { startHour, endHour, enabled = 1, minGapMinutes = 0 } = request.body;
  if (!platformId || startHour === undefined || endHour === undefined) {
    return reply.status(400).send({ error: 'platformId, startHour, endHour required' });
  }
  try {
    await queries.updateWindow.run({ platformId, startHour, endHour, enabled, minGapMinutes });
    return { success: true };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to update window' });
  }
});

// POST Toggle Platform
fastify.post<{ Body: { id: string; status?: 'enabled' | 'disabled' } }>('/api/platforms/toggle', async (request, reply) => {
  const { id, status } = request.body;
  if (!id) return reply.status(400).send({ error: 'id is required' });
  try {
    if (status) {
      await queries.setPlatformStatus.run({ id, status });
    } else {
      await queries.togglePlatform.run({ id });
    }
    return { success: true };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to toggle platform' });
  }
});

// GET Settings
fastify.get('/api/settings', async () => {
  const rows = await queries.getAllSettings.all() as { key: string, value: string }[];
  // Convert array to object: { key: value }
  const settings = rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
  return settings;
});

// UPDATE Settings
fastify.put<{ Body: Record<string, string> }>('/api/settings', async (request, reply) => {
  const data = request.body;
  
  try {
    // Loop through updates
    for (const [key, value] of Object.entries(data)) {
       await queries.upsertSetting.run({ key, value });
    }
    
    return { success: true };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to update settings' });
  }
});

// Generate AI Content (proxy)
fastify.post<{ Body: { topic: string; clusters: string[]; provider?: 'gemini' | 'grok' } }>('/api/generate', async (request, reply) => {
  const { topic, clusters = [], provider } = request.body;
  const settingsRows = await queries.getAllSettings.all() as { key: string, value: string }[];
  const settings = settingsRows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
  const geminiKey = process.env.GEMINI_API_KEY || settings['GEMINI_API_KEY'] || '';
  const grokKey = process.env.GROK_API_KEY || settings['GROK_API_KEY'] || '';
  const selectedProvider = provider || (geminiKey ? 'gemini' : grokKey ? 'grok' : 'grok');
  try {
    const platforms = ['instagram','facebook','twitter','linkedin','tiktok'];
    const result = platforms.slice(0, Math.max(1, clusters.length || 3)).map((p, i) => ({
      id: randomUUID(),
      platformId: p,
      content: `${topic} — ${p} — variant ${i+1}`,
      status: 'draft'
    }));
    return { provider: selectedProvider, posts: result };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to generate content' });
  }
});
fastify.post<{ Body: { platformId: string; content: string; mediaUrls?: string[] } }>('/api/publish/trigger', { preHandler: [requireApiKey, requireLicense] }, async (request, reply) => {
  const { platformId, content, mediaUrls = [] } = request.body;
  try {
    const LoaderMod = await import('../src/platforms/adapters/AdapterLoader');
    const getAdapterFn: any = (LoaderMod as any).getAdapter || ((LoaderMod as any).default && (LoaderMod as any).default.getAdapter);
    const adapter = getAdapterFn ? getAdapterFn(platformId) : undefined;
    if (!adapter) return reply.status(400).send({ error: 'adapter_missing' });
    const post = {
      id: String(Date.now()),
      content,
      status: 'draft' as any,
      scheduledAt: new Date().toISOString(),
      platformIds: [platformId],
      mediaUrls
    };
    const v = adapter.validateContent(post as any);
    if (!v.valid) return reply.status(400).send({ error: (v.errors || []).join(',') || 'validation_failed' });
    const res = await adapter.publish(post as any);
    const { pushLog } = await import('./logs');
    pushLog({ ts: Date.now(), platformId, postId: post.id, event: 'manual_trigger_success', message: res.externalId })
    return { success: true, externalId: res.externalId };
  } catch (err) {
    const { pushLog } = await import('./logs');
    pushLog({ ts: Date.now(), platformId, event: 'manual_trigger_error', message: String((err as any)?.message || '') })
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to trigger publish' });
  }
});
fastify.get('/api/logs/publish', async () => {
  const { getLogs } = await import('./logs');
  return getLogs();
});
// Start Server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
