-- omnipost/backend/src/db/schema.sql

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published');

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    status post_status DEFAULT 'draft' NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    platform_variants TEXT,
    platform_post_ids TEXT,
    platform_urls TEXT,
    analytics_status VARCHAR(32) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    errors TEXT,
    status_extended VARCHAR(32)
);

-- Add trigger for updated_at column on posts table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create media table
CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes INTEGER NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tags TEXT,
    folder VARCHAR(128)
);

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

-- Post-Media join table
CREATE TABLE IF NOT EXISTS post_media (
  post_id  TEXT NOT NULL,
  media_id TEXT NOT NULL,
  PRIMARY KEY (post_id, media_id)
);
