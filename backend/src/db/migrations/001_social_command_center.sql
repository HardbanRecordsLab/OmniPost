-- Migration: 001_social_command_center.sql
-- Social Command Center Pro — new tables
-- SQLite-compatible syntax (TEXT for UUIDs, DATETIME instead of TIMESTAMPTZ, no gen_random_uuid())

-- Session Vault
-- Stores AES-256-GCM encrypted browser cookies per user/platform
CREATE TABLE IF NOT EXISTS session_vault (
  id                TEXT PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform          VARCHAR(64) NOT NULL,
  label             VARCHAR(128) NOT NULL,
  encrypted_cookies TEXT NOT NULL,
  iv                VARCHAR(64) NOT NULL,
  auth_tag          VARCHAR(64) NOT NULL,
  captured_at       DATETIME NOT NULL DEFAULT (datetime('now')),
  last_used_at      DATETIME,
  CONSTRAINT max_3_per_platform UNIQUE (user_id, platform, label)
);
CREATE INDEX IF NOT EXISTS idx_vault_user_platform ON session_vault(user_id, platform);

-- Platform Configs
-- Persisted registry entries for dynamic platform additions
CREATE TABLE IF NOT EXISTS platform_configs (
  id                VARCHAR(64) PRIMARY KEY,
  display_name      VARCHAR(128) NOT NULL,
  base_url          VARCHAR(512) NOT NULL,
  login_url         VARCHAR(512) NOT NULL,
  post_url          VARCHAR(512) NOT NULL,
  adapter_type      VARCHAR(32) NOT NULL CHECK (adapter_type IN ('puppeteer', 'smart_launcher')),
  tone_category     VARCHAR(32) NOT NULL,
  char_limit        INTEGER,
  category          VARCHAR(64) NOT NULL,
  supports_hashtags BOOLEAN NOT NULL DEFAULT 1,
  is_active         BOOLEAN NOT NULL DEFAULT 1,
  created_at        DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Publish Log
-- Anti-ban publish tracking (also mirrored in Redis for speed)
CREATE TABLE IF NOT EXISTS publish_log (
  id           TEXT PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     VARCHAR(64) NOT NULL,
  post_id      TEXT,
  published_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_publish_log_user_platform_time ON publish_log(user_id, platform, published_at);

-- Analytics Snapshots
-- Scraped engagement metrics per post per platform
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id              TEXT PRIMARY KEY,
  post_id         TEXT NOT NULL,
  platform        VARCHAR(64) NOT NULL,
  likes           INTEGER NOT NULL DEFAULT 0,
  comments        INTEGER NOT NULL DEFAULT 0,
  shares          INTEGER NOT NULL DEFAULT 0,
  views           INTEGER NOT NULL DEFAULT 0,
  scraped_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  scrape_attempts INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_analytics_post_platform ON analytics_snapshots(post_id, platform);

-- Tracked Links
-- Short/vanity URLs with click tracking
CREATE TABLE IF NOT EXISTS tracked_links (
  id           TEXT PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug         VARCHAR(50) NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  click_count  INTEGER NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Link Clicks
-- Individual click events for tracked links
CREATE TABLE IF NOT EXISTS link_clicks (
  id         TEXT PRIMARY KEY,
  link_id    TEXT NOT NULL REFERENCES tracked_links(id) ON DELETE CASCADE,
  clicked_at DATETIME NOT NULL DEFAULT (datetime('now')),
  user_agent TEXT,
  referrer   TEXT,
  ip_hash    VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id);

-- Extend posts table (SQLite-compatible: one ADD COLUMN per statement)
ALTER TABLE posts ADD COLUMN platform_variants TEXT;
ALTER TABLE posts ADD COLUMN platform_post_ids TEXT;
ALTER TABLE posts ADD COLUMN platform_urls TEXT;
ALTER TABLE posts ADD COLUMN analytics_status VARCHAR(32) DEFAULT 'pending';
ALTER TABLE posts ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN errors TEXT;
ALTER TABLE posts ADD COLUMN status_extended VARCHAR(32);

-- Extend media table
ALTER TABLE media ADD COLUMN tags TEXT;
ALTER TABLE media ADD COLUMN folder VARCHAR(128);

-- Post-Media join table
CREATE TABLE IF NOT EXISTS post_media (
  post_id  TEXT NOT NULL,
  media_id TEXT NOT NULL,
  PRIMARY KEY (post_id, media_id)
);
