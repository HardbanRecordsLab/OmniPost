import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://hbrl_admin:HardbanRecordsLab2026!@hbrl-postgres:5432/hbrl_central';

const pool = new Pool({
  connectionString,
});

// Helper to mimic better-sqlite3 statement
const stmt = (originalSql: string) => {
    // 1. Dialect fixes for Postgres
    let sql = originalSql
        .replace(/datetime\('now'\)/g, "NOW()")
        .replace(/datetime\(scheduled_at\)/g, "scheduled_at") // specific fix
        .replace(/datetime\(([^)]+)\)/g, "$1") // generic fix
        .replace(/INTEGER PRIMARY KEY/g, "SERIAL PRIMARY KEY") // ID auto-inc
        //.replace(/TEXT PRIMARY KEY/g, "TEXT PRIMARY KEY") // Supported
        .replace(/DATETIME/g, "TIMESTAMP")
        .replace(/excluded\./g, "EXCLUDED."); // Postgres requires uppercase usually? No, case insensitive.

    // 2. Param parsing
    const isNamed = sql.includes('@');
    let finalSql = sql;
    let mapParams: (p: any) => any[] = (p) => {
         if (p === undefined || p === null) return [];
         return Array.isArray(p) ? p : [p];
    };

    if (isNamed) {
        const paramNames: string[] = [];
        let i = 1;
        finalSql = sql.replace(/@(\w+)/g, (_, name) => {
            paramNames.push(name);
            return `$${i++}`;
        });
        mapParams = (p: any) => paramNames.map(name => p[name]);
    } else {
        // Positional ? -> $1, $2...
        let i = 1;
        finalSql = sql.replace(/\?/g, () => `$${i++}`);
        // mapParams remains default (array or single value)
    }

    return {
        all: async (params: any = []) => {
            const values = mapParams(params);
            try {
                const res = await pool.query(finalSql, values);
                return res.rows;
            } catch (e) {
                console.error('Query Error (all):', e, finalSql);
                throw e;
            }
        },
        run: async (params: any = []) => {
            const values = mapParams(params);
            try {
                const res = await pool.query(finalSql, values);
                return { changes: res.rowCount || 0, lastInsertRowid: 0 };
            } catch (e) {
                console.error('Query Error (run):', e, finalSql);
                throw e;
            }
        },
        get: async (params: any = []) => {
            const values = mapParams(params);
            try {
                const res = await pool.query(finalSql, values);
                return res.rows[0];
            } catch (e) {
                console.error('Query Error (get):', e, finalSql);
                throw e;
            }
        }
    };
};

export async function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        vps_bridge_url TEXT NOT NULL,
        vps_key TEXT,
        created_at TIMESTAMP DEFAULT NOW()
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
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        platform_id TEXT,
        campaign_id TEXT,
        content TEXT NOT NULL,
        media_url TEXT,
        status TEXT DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
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
        valid_until TIMESTAMP,
        plan_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await pool.query(schema);

  // Schema migrations (checking columns)
  // Simplified for now: assume schema is stable or use IF NOT EXISTS logic manually
  try {
      // Postgres doesn't support PRAGMA. We query information_schema.
      const checkCol = async (table: string, col: string, type: string) => {
          const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name=$1 AND column_name=$2
          `, [table, col]);
          if (res.rowCount === 0) {
              await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
          }
      };

      await checkCol('posts', 'platform_ids', 'TEXT');
      await checkCol('posts', 'media_urls', 'TEXT');
      await checkCol('platforms', 'status', "TEXT DEFAULT 'disabled'");
      await checkCol('platforms', 'account_info', 'TEXT');
  } catch (e) {
      console.error("Migration error:", e);
  }
}

export const queries = {
  // v6 API queries
  getAllPostsV6: stmt(`
    SELECT 
      id,
      content,
      scheduled_at as "scheduledAt",
      status,
      platform_ids as "platformIds",
      media_urls as "mediaUrls",
      created_at as "createdAt"
    FROM posts
    WHERE status IN ('scheduled','draft','published')
    ORDER BY scheduled_at ASC
  `),
  insertPostV6: stmt(`
    INSERT INTO posts (id, content, scheduled_at, status, platform_ids, media_urls)
    VALUES (@id, @content, @scheduledAt, @status, @platformIds, @mediaUrls)
  `),
  updatePostV6: stmt(`
    UPDATE posts 
    SET content = @content, scheduled_at = @scheduledAt, status = @status, platform_ids = @platformIds
    WHERE id = @id
  `),
  getPlatformsV6: stmt(`
    SELECT 
      id,
      name,
      status,
      account_info as "accountInfo"
    FROM platforms
  `),
  togglePlatform: stmt(`
    UPDATE platforms
    SET status = CASE WHEN status = 'enabled' THEN 'disabled' ELSE 'enabled' END
    WHERE id = @id
  `),
  setPlatformStatus: stmt(`
    UPDATE platforms SET status = @status WHERE id = @id
  `),
  // Scheduler queries
  getDuePosts: stmt(`
    SELECT 
      id, 
      platform_id as "platformId", 
      campaign_id as "campaignId", 
      content, 
      media_url as "mediaUrl", 
      status, 
      scheduled_at as "scheduledAt", 
      retry_count, 
      last_error, 
      created_at as "createdAt" 
    FROM posts 
    WHERE status = 'scheduled' 
    AND scheduled_at <= NOW()
  `),
  
  updatePostStatus: stmt(`
    UPDATE posts SET status = @status, last_error = @lastError, retry_count = @retryCount 
    WHERE id = @id
  `),
  updatePostRetry: stmt(`
    UPDATE posts SET status = 'scheduled', last_error = @lastError, retry_count = @retryCount, scheduled_at = @scheduledAt 
    WHERE id = @id
  `),

  markAsPublishing: stmt(`
    UPDATE posts SET status = 'publishing' WHERE id = ?
  `),

  // API queries
  getAllPosts: stmt(`
    SELECT 
      id, 
      platform_id as "platformId", 
      campaign_id as "campaignId", 
      content, 
      media_url as "mediaUrl", 
      status, 
      scheduled_at as "scheduledAt", 
      retry_count, 
      last_error, 
      created_at as "createdAt" 
    FROM posts ORDER BY scheduled_at ASC
  `),

  getPostById: stmt(`
    SELECT 
      id, 
      platform_id as "platformId", 
      campaign_id as "campaignId", 
      content, 
      media_url as "mediaUrl", 
      status, 
      scheduled_at as "scheduledAt", 
      retry_count, 
      last_error, 
      created_at as "createdAt" 
    FROM posts WHERE id = ?
  `),

  insertPost: stmt(`
    INSERT INTO posts (id, platform_id, campaign_id, content, media_url, status, scheduled_at)
    VALUES (@id, @platformId, @campaignId, @content, @mediaUrl, @status, @scheduledAt)
  `),

  updatePost: stmt(`
    UPDATE posts 
    SET content = @content, scheduled_at = @scheduledAt, status = @status
    WHERE id = @id
  `),

  deletePost: stmt(`
    DELETE FROM posts WHERE id = ?
  `),

  // Campaign queries
  createCampaign: stmt(`
    INSERT INTO campaigns (id, name, original_prompt)
    VALUES (@id, @name, @originalPrompt)
  `),

  getCampaigns: stmt(`
    SELECT * FROM campaigns ORDER BY created_at DESC
  `),

  checkSlot: stmt(`
    SELECT COUNT(*) as count FROM posts 
    WHERE platform_id = @platformId AND scheduled_at = @scheduledAt
  `),

  // Platform queries
  getAllPlatforms: stmt(`
    SELECT * FROM platforms
  `),

  updatePlatformStatus: stmt(`
    UPDATE platforms SET is_active = @isActive WHERE id = @id
  `),

  upsertPlatform: stmt(`
    INSERT INTO platforms (id, name, is_active, settings_json)
    VALUES (@id, @name, @isActive, @settingsJson)
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    settings_json = EXCLUDED.settings_json
  `),

  // Settings queries
  getAllSettings: stmt(`
    SELECT key, value FROM system_settings
  `),

  upsertSetting: stmt(`
    INSERT INTO system_settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value
  `),

  // Publish windows
  getAllWindows: stmt(`
    SELECT platform_id as "platformId", start_hour as "startHour", end_hour as "endHour", enabled, min_gap_minutes as "minGapMinutes" FROM platform_windows
  `),
  getWindowByPlatform: stmt(`
    SELECT platform_id as "platformId", start_hour as "startHour", end_hour as "endHour", enabled, min_gap_minutes as "minGapMinutes" FROM platform_windows WHERE platform_id = ?
  `),
  upsertWindow: stmt(`
    INSERT INTO platform_windows (platform_id, start_hour, end_hour, enabled, min_gap_minutes)
    VALUES (@platformId, @startHour, @endHour, @enabled, @minGapMinutes)
    ON CONFLICT (platform_id) DO UPDATE SET
      start_hour = EXCLUDED.start_hour,
      end_hour = EXCLUDED.end_hour,
      enabled = EXCLUDED.enabled,
      min_gap_minutes = EXCLUDED.min_gap_minutes
  `),
  updateWindow: stmt(`
    UPDATE platform_windows SET start_hour = @startHour, end_hour = @endHour, enabled = @enabled, min_gap_minutes = @minGapMinutes WHERE platform_id = @platformId
  `),
  getPlans: stmt(`
    SELECT id, name, price_cents as "priceCents", currency, period, features FROM subscription_plans
  `),
  upsertPlan: stmt(`
    INSERT INTO subscription_plans (id, name, price_cents, currency, period, features)
    VALUES (@id, @name, @priceCents, @currency, @period, @features)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      price_cents = EXCLUDED.price_cents,
      currency = EXCLUDED.currency,
      period = EXCLUDED.period,
      features = EXCLUDED.features
  `),
  getActiveLicense: stmt(`
    SELECT * FROM licenses WHERE status = 'active' AND (valid_until IS NULL OR valid_until > NOW()) LIMIT 1
  `),
  createLicense: stmt(`
    INSERT INTO licenses (key, status, valid_until, plan_id)
    VALUES (@key, @status, @validUntil, @planId)
    ON CONFLICT (key) DO UPDATE SET
      status = EXCLUDED.status,
      valid_until = EXCLUDED.valid_until,
      plan_id = EXCLUDED.plan_id
  `)
};
