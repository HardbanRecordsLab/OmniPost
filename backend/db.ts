
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, '../data/omnipost.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize Schema immediately to ensure tables exist for queries
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        vps_bridge_url TEXT NOT NULL,
        vps_key TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS platforms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        settings_json TEXT,
        status TEXT DEFAULT 'disabled',
        account_info TEXT
    );

    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        original_prompt TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        platform_id TEXT,
        campaign_id TEXT,
        content TEXT NOT NULL,
        media_url TEXT,
        status TEXT DEFAULT 'draft',
        scheduled_at DATETIME,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        platform_ids TEXT,
        media_urls TEXT
    );

    CREATE TABLE IF NOT EXISTS platform_windows (
        platform_id TEXT PRIMARY KEY,
        start_hour INTEGER NOT NULL,
        end_hour INTEGER NOT NULL,
        enabled INTEGER DEFAULT 1,
        min_gap_minutes INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        period TEXT NOT NULL,
        features TEXT
    );
    
    CREATE TABLE IF NOT EXISTS licenses (
        key TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        valid_until DATETIME,
        plan_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Ensure new columns exist on legacy databases
try {
  const postCols = db.prepare(`PRAGMA table_info(posts)`).all() as { name: string }[];
  const postColNames = new Set(postCols.map(c => c.name));
  if (!postColNames.has('platform_ids')) {
    db.exec(`ALTER TABLE posts ADD COLUMN platform_ids TEXT`);
  }
  if (!postColNames.has('media_urls')) {
    db.exec(`ALTER TABLE posts ADD COLUMN media_urls TEXT`);
  }
} catch {}

try {
  const platCols = db.prepare(`PRAGMA table_info(platforms)`).all() as { name: string }[];
  const platColNames = new Set(platCols.map(c => c.name));
  if (!platColNames.has('status')) {
    db.exec(`ALTER TABLE platforms ADD COLUMN status TEXT DEFAULT 'disabled'`);
  }
  if (!platColNames.has('account_info')) {
    db.exec(`ALTER TABLE platforms ADD COLUMN account_info TEXT`);
  }
} catch {}
export function initDb() {
  // No-op or re-run safe, kept for backward compatibility if imported elsewhere
}

export const queries = {
  // v6 API queries (Buffer-like)
  getAllPostsV6: db.prepare(`
    SELECT 
      id,
      content,
      scheduled_at as scheduledAt,
      status,
      platform_ids as platformIds,
      media_urls as mediaUrls,
      created_at as createdAt
    FROM posts
    WHERE status IN ('scheduled','draft','published')
    ORDER BY datetime(scheduled_at) ASC
  `),
  insertPostV6: db.prepare(`
    INSERT INTO posts (id, content, scheduled_at, status, platform_ids, media_urls)
    VALUES (@id, @content, @scheduledAt, @status, @platformIds, @mediaUrls)
  `),
  updatePostV6: db.prepare(`
    UPDATE posts 
    SET content = @content, scheduled_at = @scheduledAt, status = @status, platform_ids = @platformIds
    WHERE id = @id
  `),
  getPlatformsV6: db.prepare(`
    SELECT 
      id,
      name,
      status,
      account_info as accountInfo
    FROM platforms
  `),
  togglePlatform: db.prepare(`
    UPDATE platforms
    SET status = CASE WHEN status = 'enabled' THEN 'disabled' ELSE 'enabled' END
    WHERE id = @id
  `),
  setPlatformStatus: db.prepare(`
    UPDATE platforms SET status = @status WHERE id = @id
  `),
  // Scheduler queries
  getDuePosts: db.prepare(`
    SELECT 
      id, 
      platform_id as platformId, 
      campaign_id as campaignId, 
      content, 
      media_url as mediaUrl, 
      status, 
      scheduled_at as scheduledAt, 
      retry_count, 
      last_error, 
      created_at as createdAt 
    FROM posts 
    WHERE status = 'scheduled' 
    AND datetime(scheduled_at) <= datetime('now')
  `),
  
  updatePostStatus: db.prepare(`
    UPDATE posts SET status = @status, last_error = @lastError, retry_count = @retryCount 
    WHERE id = @id
  `),
  updatePostRetry: db.prepare(`
    UPDATE posts SET status = 'scheduled', last_error = @lastError, retry_count = @retryCount, scheduled_at = @scheduledAt 
    WHERE id = @id
  `),

  markAsPublishing: db.prepare(`
    UPDATE posts SET status = 'publishing' WHERE id = ?
  `),

  // API queries
  getAllPosts: db.prepare(`
    SELECT 
      id, 
      platform_id as platformId, 
      campaign_id as campaignId, 
      content, 
      media_url as mediaUrl, 
      status, 
      scheduled_at as scheduledAt, 
      retry_count, 
      last_error, 
      created_at as createdAt 
    FROM posts ORDER BY scheduled_at ASC
  `),

  getPostById: db.prepare(`
    SELECT 
      id, 
      platform_id as platformId, 
      campaign_id as campaignId, 
      content, 
      media_url as mediaUrl, 
      status, 
      scheduled_at as scheduledAt, 
      retry_count, 
      last_error, 
      created_at as createdAt 
    FROM posts WHERE id = ?
  `),

  insertPost: db.prepare(`
    INSERT INTO posts (id, platform_id, campaign_id, content, media_url, status, scheduled_at)
    VALUES (@id, @platformId, @campaignId, @content, @mediaUrl, @status, @scheduledAt)
  `),

  updatePost: db.prepare(`
    UPDATE posts 
    SET content = @content, scheduled_at = @scheduledAt, status = @status
    WHERE id = @id
  `),

  deletePost: db.prepare(`
    DELETE FROM posts WHERE id = ?
  `),

  // Campaign queries
  createCampaign: db.prepare(`
    INSERT INTO campaigns (id, name, original_prompt)
    VALUES (@id, @name, @originalPrompt)
  `),

  getCampaigns: db.prepare(`
    SELECT * FROM campaigns ORDER BY created_at DESC
  `),

  checkSlot: db.prepare(`
    SELECT COUNT(*) as count FROM posts 
    WHERE platform_id = @platformId AND scheduled_at = @scheduledAt
  `),

  // Platform queries
  getAllPlatforms: db.prepare(`
    SELECT * FROM platforms
  `),

  updatePlatformStatus: db.prepare(`
    UPDATE platforms SET is_active = @isActive WHERE id = @id
  `),

  upsertPlatform: db.prepare(`
    INSERT INTO platforms (id, name, is_active, settings_json)
    VALUES (@id, @name, @isActive, @settingsJson)
    ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    is_active = excluded.is_active,
    settings_json = excluded.settings_json
  `),

  // Settings queries
  getAllSettings: db.prepare(`
    SELECT key, value FROM system_settings
  `),

  upsertSetting: db.prepare(`
    INSERT INTO system_settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET
    value = excluded.value
  `),

  // Publish windows
  getAllWindows: db.prepare(`
    SELECT platform_id as platformId, start_hour as startHour, end_hour as endHour, enabled, min_gap_minutes as minGapMinutes FROM platform_windows
  `),
  getWindowByPlatform: db.prepare(`
    SELECT platform_id as platformId, start_hour as startHour, end_hour as endHour, enabled, min_gap_minutes as minGapMinutes FROM platform_windows WHERE platform_id = ?
  `),
  upsertWindow: db.prepare(`
    INSERT INTO platform_windows (platform_id, start_hour, end_hour, enabled, min_gap_minutes)
    VALUES (@platformId, @startHour, @endHour, @enabled, @minGapMinutes)
    ON CONFLICT(platform_id) DO UPDATE SET
      start_hour = excluded.start_hour,
      end_hour = excluded.end_hour,
      enabled = excluded.enabled,
      min_gap_minutes = excluded.min_gap_minutes
  `),
  updateWindow: db.prepare(`
    UPDATE platform_windows SET start_hour = @startHour, end_hour = @endHour, enabled = @enabled, min_gap_minutes = @minGapMinutes WHERE platform_id = @platformId
  `),
  getPlans: db.prepare(`
    SELECT id, name, price_cents as priceCents, currency, period, features FROM subscription_plans
  `),
  upsertPlan: db.prepare(`
    INSERT INTO subscription_plans (id, name, price_cents, currency, period, features)
    VALUES (@id, @name, @priceCents, @currency, @period, @features)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      price_cents = excluded.price_cents,
      currency = excluded.currency,
      period = excluded.period,
      features = excluded.features
  `),
  getActiveLicense: db.prepare(`
    SELECT key, status, valid_until as validUntil, plan_id as planId FROM licenses
    WHERE status = 'active' AND datetime(valid_until) >= datetime('now')
    ORDER BY valid_until DESC LIMIT 1
  `),
  getLicenseByKey: db.prepare(`
    SELECT key, status, valid_until as validUntil, plan_id as planId FROM licenses WHERE key = ?
  `),
  createLicense: db.prepare(`
    INSERT INTO licenses (key, status, valid_until, plan_id)
    VALUES (@key, @status, @validUntil, @planId)
  `),
  setLicenseStatus: db.prepare(`
    UPDATE licenses SET status = @status WHERE key = @key
  `)
  countOverlapPosts: db.prepare(`
    SELECT COUNT(*) as count FROM posts 
    WHERE id != @id
    AND scheduled_at BETWEEN @startRange AND @endRange
    AND (
      platform_id = @platformId OR 
      (platform_ids IS NOT NULL AND platform_ids LIKE '%' || @platformId || '%')
    )
  `)
};

// Ensure required platforms exist
const ensurePlatforms = db.transaction((platforms) => {
  for (const p of platforms) queries.upsertPlatform.run(p);
});
ensurePlatforms([
  { id: 'instagram', name: 'Instagram', isActive: 0, settingsJson: '{}' },
  { id: 'facebook', name: 'Facebook', isActive: 0, settingsJson: '{}' },
  { id: 'twitter', name: 'Twitter (X)', isActive: 0, settingsJson: '{}' },
  { id: 'linkedin', name: 'LinkedIn', isActive: 0, settingsJson: '{}' },
  { id: 'tiktok', name: 'TikTok', isActive: 0, settingsJson: '{}' },
  { id: 'youtube', name: 'YouTube', isActive: 0, settingsJson: '{}' },
  { id: 'telegram', name: 'Telegram', isActive: 0, settingsJson: '{}' },
  { id: 'discord', name: 'Discord', isActive: 0, settingsJson: '{}' },
  { id: 'reddit', name: 'Reddit', isActive: 0, settingsJson: '{}' },
  { id: 'pinterest', name: 'Pinterest', isActive: 0, settingsJson: '{}' },
  { id: 'bluesky', name: 'Bluesky', isActive: 0, settingsJson: '{}' }
]);

// Seed default publish windows if empty
try {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM platform_windows').get() as { count: number };
  if (countRow.count === 0) {
    const seedWindows = db.transaction((rows: Array<{ platformId: string; startHour: number; endHour: number; enabled: number; minGapMinutes: number }>) => {
      for (const r of rows) queries.upsertWindow.run(r);
    });
    seedWindows([
      { platformId: 'instagram', startHour: 8, endHour: 22, enabled: 1, minGapMinutes: 30 },
      { platformId: 'facebook', startHour: 7, endHour: 22, enabled: 1, minGapMinutes: 30 },
      { platformId: 'twitter', startHour: 0, endHour: 23, enabled: 1, minGapMinutes: 5 },
      { platformId: 'linkedin', startHour: 8, endHour: 18, enabled: 1, minGapMinutes: 60 },
      { platformId: 'tiktok', startHour: 9, endHour: 23, enabled: 1, minGapMinutes: 30 }
    ]);
  }
} catch {}

// Seed settings if empty
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM system_settings').get() as { count: number };
if (settingsCount.count === 0) {
  const seedSettings = db.transaction((settings) => {
    for (const s of settings) queries.upsertSetting.run(s);
  });
  seedSettings([
    { key: 'instanceName', value: 'OmniPost Local' },
    { key: 'timezone', value: 'UTC' },
    { key: 'defaultProvider', value: 'gemini' }
  ]);
  console.log('Seeded settings');
}

try {
  const planCount = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get() as { count: number };
  if (planCount.count === 0) {
    const seedPlans = db.transaction((rows: Array<{ id: string; name: string; priceCents: number; currency: string; period: string; features: string }>) => {
      for (const r of rows) queries.upsertPlan.run(r);
    });
    seedPlans([
      { id: 'basic-monthly', name: 'Basic', priceCents: 1900, currency: 'USD', period: 'monthly', features: 'calendar,queue,editor' },
      { id: 'pro-monthly', name: 'Pro', priceCents: 3900, currency: 'USD', period: 'monthly', features: 'calendar,queue,editor,batch,windows' }
    ]);
  }
} catch {}

try {
  const active = queries.getActiveLicense.get() as any;
  if (!active) {
    const key = 'trial';
    const until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    queries.createLicense.run({ key, status: 'active', validUntil: until, planId: 'basic-monthly' });
  }
} catch {}

const resetPosts = db.transaction(() => {
  db.exec('DELETE FROM posts');
  const seedStmt = db.prepare('INSERT INTO posts (id, platform_id, content, scheduled_at, status, platform_ids, media_urls) VALUES (@id, @platformId, @content, @scheduledAt, @status, @platformIds, @mediaUrls)');
  seedStmt.run({
    id: randomUUID(),
    platformId: 'telegram',
    content: '🚀 Testowy post na poniedziałek',
    scheduledAt: '2026-02-09T10:00:00Z',
    status: 'scheduled',
    platformIds: '["telegram"]',
    mediaUrls: ''
  });
  seedStmt.run({
    id: randomUUID(),
    platformId: 'discord',
    content: '🔥 HardbanRecords Lab Launch - LIVE',
    scheduledAt: '2026-02-04T12:00:00Z',
    status: 'published',
    platformIds: '["discord","telegram"]',
    mediaUrls: ''
  });
  seedStmt.run({
    id: randomUUID(),
    platformId: 'generic',
    content: '🤖 AI Automation Draft',
    scheduledAt: '2026-02-10T15:30:00Z',
    status: 'draft',
    platformIds: '[]',
    mediaUrls: ''
  });
  seedStmt.run({
    id: randomUUID(),
    platformId: 'twitter',
    content: 'Test publish via adapter for Twitter',
    scheduledAt: new Date(Date.now() - 30000).toISOString(),
    status: 'scheduled',
    platformIds: '["twitter"]',
    mediaUrls: ''
  });
  seedStmt.run({
    id: randomUUID(),
    platformId: 'instagram',
    content: 'Test publish via adapter for Instagram',
    scheduledAt: new Date(Date.now() - 30000).toISOString(),
    status: 'scheduled',
    platformIds: '["instagram"]',
    mediaUrls: '["https://example.com/a.jpg"]'
  });
});
resetPosts();

export default db;
