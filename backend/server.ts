import dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { initDb, queries, pool } from './db';
import { startScheduler } from './scheduler';
import { randomUUID } from 'crypto';
import socialMediaService from './src/services/social-media.service';
import { mediaService } from './src/services/media.service';
import { aiService } from './src/services/ai.service';
import path from 'path';

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

fastify.register(multipart, {
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit for video uploads
  }
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

// ========== INTEGRATIONS ROUTES ==========

// GET /api/integrations
fastify.get('/api/integrations', async (request, reply) => {
    try {
        // Assuming single user for now or getting user ID from request (mock for VPS)
        const userId = 'default-user'; // Replace with actual user extraction if auth implemented
        const accounts = await socialMediaService.getConnectedAccounts(userId);
        return { success: true, accounts };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// POST /api/integrations/:platform/connect
fastify.post<{ Params: { platform: string } }>('/api/integrations/:platform/connect', async (request, reply) => {
    try {
        const { platform } = request.params;
        const userId = 'default-user'; // Replace with actual user extraction
        const authUrl = socialMediaService.getAuthUrl(platform, userId);
        return { success: true, authUrl };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// GET /api/integrations/:platform/callback
fastify.get<{ Params: { platform: string }, Querystring: { code: string; state: string } }>('/api/integrations/:platform/callback', async (request, reply) => {
    try {
        const { platform } = request.params;
        const { code, state } = request.query;

        if (!code) {
             return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=authorization_failed`);
        }

        await socialMediaService.handleCallback(platform, code, state);

        return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?success=true&platform=${platform}`);
    } catch (error: any) {
        request.log.error(error);
        return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=${encodeURIComponent(error.message)}`);
    }
});

// DELETE /api/integrations/:accountId
fastify.delete<{ Params: { accountId: string } }>('/api/integrations/:accountId', async (request, reply) => {
    try {
        const userId = 'default-user'; // Replace with actual user extraction
        await socialMediaService.disconnectAccount(userId, request.params.accountId);
        return { success: true };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// ========== MEDIA ROUTES ==========

// POST /api/media/upload
fastify.post('/api/media/upload', async (request, reply) => {
    try {
        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ success: false, error: 'No file uploaded' });
        }
        
        // Convert stream to buffer (NOTE: For large files this should be optimized to stream directly to disk)
        const buffer = await data.toBuffer();
        
        const fileObj = {
            buffer,
            mimetype: data.mimetype,
            originalname: data.filename,
            size: buffer.length
        };

        const userId = 'default-user';
        const media = await mediaService.uploadMedia(userId, fileObj);
        return { success: true, media };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// POST /api/media/upload-multiple
fastify.post('/api/media/upload-multiple', async (request, reply) => {
    try {
        const parts = request.files();
        const userId = 'default-user';
        const mediaFiles = [];

        for await (const part of parts) {
             const buffer = await part.toBuffer();
             const fileObj = {
                buffer,
                mimetype: part.mimetype,
                originalname: part.filename,
                size: buffer.length
            };
            const media = await mediaService.uploadMedia(userId, fileObj);
            mediaFiles.push(media);
        }

        return { success: true, media: mediaFiles };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// GET /api/media
fastify.get('/api/media', async (request, reply) => {
    try {
        const userId = 'default-user';
        const result = await pool.query(
            'SELECT * FROM media WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
            [userId]
        );
        return { success: true, media: result.rows };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// DELETE /api/media/:id
fastify.delete<{ Params: { id: string } }>('/api/media/:id', async (request, reply) => {
    try {
        const userId = 'default-user';
        await mediaService.deleteMedia(userId, request.params.id);
        return { success: true };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// ========== AI ROUTES ==========

fastify.post<{ Body: { prompt: string; platform: string; tone: string; length?: any; includeHashtags?: boolean; includeEmojis?: boolean } }>('/api/ai/generate-caption', async (request, reply) => {
    try {
        const { prompt, platform, tone, length, includeHashtags, includeEmojis } = request.body;
        const caption = await aiService.generateCaption(prompt, {
            platform,
            tone,
            length,
            includeHashtags,
            includeEmojis
        });
        return { success: true, caption };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

fastify.post<{ Body: { caption: string; improvement: string } }>('/api/ai/improve-caption', async (request, reply) => {
    try {
        const { caption, improvement } = request.body;
        const improvedCaption = await aiService.improveCaption(caption, improvement);
        return { success: true, caption: improvedCaption };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

fastify.post<{ Body: { caption: string; platform: string; count: number } }>('/api/ai/generate-hashtags', async (request, reply) => {
    try {
        const { caption, platform, count } = request.body;
        const hashtags = await aiService.generateHashtags(caption, platform, count);
        return { success: true, hashtags };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

fastify.post<{ Body: { topic: string; days: number; platforms: string[] } }>('/api/ai/generate-calendar', async (request, reply) => {
    try {
        const { topic, days, platforms } = request.body;
        const calendar = await aiService.generateContentCalendar(topic, days, platforms);
        return { success: true, calendar };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// ========== ANALYTICS & DRAFTS ==========

fastify.get<{ Params: { id: string } }>('/api/analytics/post/:id', async (request, reply) => {
    try {
         const result = await pool.query(`
          SELECT * FROM post_analytics
          WHERE post_id = $1
          ORDER BY fetched_at DESC
        `, [request.params.id]);
        return { success: true, analytics: result.rows };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

fastify.post<{ Params: { postId: string; platform: string } }>('/api/analytics/fetch/:postId/:platform', async (request, reply) => {
    try {
        const insights = await socialMediaService.fetchAnalytics(
            request.params.postId,
            request.params.platform
        );
        return { success: true, insights };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

fastify.post<{ Body: { content: string; platforms: any; mediaIds: any } }>('/api/drafts/save', async (request, reply) => {
    try {
        const { content, platforms, mediaIds } = request.body;
        const userId = 'default-user';
        await pool.query(`
          INSERT INTO drafts (user_id, content, platforms, media_ids)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id) DO UPDATE SET
            content = $2, platforms = $3, media_ids = $4, last_saved_at = NOW()
        `, [userId, content, platforms, mediaIds]);
        return { success: true };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

fastify.get('/api/drafts', async (request, reply) => {
    try {
        const userId = 'default-user';
        const result = await pool.query(
          'SELECT * FROM drafts WHERE user_id = $1',
          [userId]
        );
        return { success: true, draft: result.rows[0] || null };
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
});

// ========== ORIGINAL POST ROUTES (V6) ==========

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
  if (!content && (!mediaUrls || mediaUrls.length === 0)) return reply.status(400).send({ error: 'content or media is required' });
  const post = {
    id: randomUUID(),
    content: content || '',
    scheduledAt: scheduledAt || null,
    status,
    platformIds: platformIds.join(','),
    mediaUrls: mediaUrls.join(',')
  };
  try {
    await queries.insertPostV6.run(post);
    
    // Schedule the post if needed
    if (scheduledAt || status === 'publishing' || status === 'scheduled') {
        // Use scheduler service to handle the job creation
        // Note: we don't await this to keep response fast, or we can await if we want to ensure it's queued
        schedulerService.schedulePost(post.id, scheduledAt || undefined).catch(err => {
            request.log.error(`Failed to schedule post ${post.id}: ${err.message}`);
        });
    }

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
      
      // Update scheduler
      if (updatedV6.status === 'draft') {
          schedulerService.cancelScheduledPost(id).catch(console.error);
      } else if (updatedV6.status === 'scheduled' || updatedV6.status === 'publishing') {
          schedulerService.reschedulePost(id, updatedV6.scheduledAt || undefined).catch(console.error);
      }

      return { success: true, post: { ...updatedV6, platformIds: data.platformIds } };
    } else {
      const updated = {
        id,
        content: data.content || existing.content,
        scheduledAt: data.scheduledAt || existing.scheduled_at,
        status: data.status || existing.status
      };
      await queries.updatePost.run(updated);
      
      // Update scheduler for legacy update
      if (updated.status === 'draft') {
          schedulerService.cancelScheduledPost(id).catch(console.error);
      } else if (updated.status === 'scheduled' || updated.status === 'publishing') {
          schedulerService.reschedulePost(id, updated.scheduledAt || undefined).catch(console.error);
      }

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
