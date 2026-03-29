import { pool } from '../db';
import bcrypt from 'bcrypt';

async function migrate() {
    try {
        console.log('Starting Smart Migration...');

        // 1. Extensions
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // 2. Users Table Migration
        console.log('Migrating Users...');
        
        // Rename hashed_password -> password_hash
        await pool.query(`
            DO $$
            BEGIN
              IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='users' AND column_name='hashed_password') THEN
                  ALTER TABLE users RENAME COLUMN hashed_password TO password_hash;
              END IF;
            END $$;
        `);

        // Add missing columns
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC'`);

        // Attempt to convert users.id to UUID
        try {
            await pool.query(`ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid`);
            console.log('Converted users.id to UUID');
        } catch (e) {
            console.warn('Could not convert users.id to UUID. Keeping as VARCHAR.');
        }

        // 3. Posts Table Migration
        console.log('Migrating Posts...');
        
        // Add columns to posts
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id UUID`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'text'`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS platforms TEXT[]`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_specific_data JSONB`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMP`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_post_ids JSONB`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_urls JSONB`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS errors JSONB`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_prompt TEXT`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_by UUID`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS approved_by UUID`);
        await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending'`);

        // Attempt to convert posts.id to UUID
        try {
            await pool.query(`ALTER TABLE posts ALTER COLUMN id TYPE UUID USING id::uuid`);
            console.log('Converted posts.id to UUID');
        } catch (e) {
            console.warn('Could not convert posts.id to UUID. Keeping as VARCHAR.');
        }

        // 4. Create New Tables
        console.log('Creating/Updating Tables...');

        // Social Accounts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS social_accounts (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              platform VARCHAR(50) NOT NULL,
              platform_user_id VARCHAR(255),
              platform_username VARCHAR(255),
              platform_name VARCHAR(255),
              avatar_url TEXT,
              access_token TEXT,
              token_iv VARCHAR(32),
              token_auth_tag VARCHAR(32),
              refresh_token TEXT,
              token_expires_at TIMESTAMP,
              scopes TEXT[],
              account_data JSONB,
              is_active BOOLEAN DEFAULT true,
              last_synced_at TIMESTAMP,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(user_id, platform, platform_user_id)
            )
        `);

        // Media
        await pool.query(`
            CREATE TABLE IF NOT EXISTS media (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
              filename VARCHAR(255) NOT NULL,
              original_url TEXT,
              cdn_url TEXT,
              storage_key TEXT,
              thumbnail_url TEXT,
              file_type VARCHAR(50),
              mime_type VARCHAR(100),
              file_size INTEGER,
              width INTEGER,
              height INTEGER,
              duration INTEGER,
              metadata JSONB,
              created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Post Media (Many-to-Many)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS post_media (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
              media_id UUID REFERENCES media(id) ON DELETE CASCADE,
              sort_order INTEGER DEFAULT 0,
              created_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(post_id, media_id)
            )
        `);

        // Queue Jobs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS queue_jobs (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
              platform VARCHAR(50) NOT NULL,
              job_id VARCHAR(255) UNIQUE,
              status VARCHAR(50) DEFAULT 'waiting',
              attempts INTEGER DEFAULT 0,
              max_attempts INTEGER DEFAULT 3,
              data JSONB,
              result JSONB,
              error JSONB,
              started_at TIMESTAMP,
              completed_at TIMESTAMP,
              created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Post Analytics
        await pool.query(`
            CREATE TABLE IF NOT EXISTS post_analytics (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
                platform VARCHAR(50) NOT NULL,
                platform_post_id VARCHAR(255),
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                saves INTEGER DEFAULT 0,
                views INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                engagement_rate DECIMAL(5,2),
                fetched_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(post_id, platform, fetched_at)
            )
        `);

        // Drafts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS drafts (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              content TEXT,
              platforms TEXT[],
              media_ids UUID[],
              last_saved_at TIMESTAMP DEFAULT NOW(),
              created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Workspaces
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workspaces (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name VARCHAR(255) NOT NULL,
              slug VARCHAR(255) UNIQUE,
              owner_id UUID REFERENCES users(id),
              created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Workspace Members
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workspace_members (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              role VARCHAR(50) DEFAULT 'member',
              created_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(workspace_id, user_id)
            )
        `);

        // Post Comments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS post_comments (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              comment TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('Tables updated successfully.');

        // 5. Create Admin User
        console.log('Creating/Updating Admin User...');
        const adminEmail = 'hardbanrecordslab.pl@gmail.com';
        const adminPassword = 'Kskomra19840220*';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Check if admin exists
        const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        
        if (adminCheck.rows.length === 0) {
            await pool.query(`
                INSERT INTO users (id, email, password_hash, role, created_at)
                VALUES (uuid_generate_v4(), $1, $2, 'admin', NOW())
            `, [adminEmail, hashedPassword]);
            console.log('Admin user created.');
        } else {
            // Update password just in case
            await pool.query(`
                UPDATE users SET password_hash = $2, role = 'admin' WHERE email = $1
            `, [adminEmail, hashedPassword]);
            console.log('Admin user updated.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
