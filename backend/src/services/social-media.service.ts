
import instagramService from '../integrations/instagram/instagram.service';
import { encryptToken, decryptToken, EncryptedData } from '../utils/encryption';
import { pool } from '../../db';

class SocialMediaService {
    platforms: { [key: string]: any };

    constructor() {
        this.platforms = {
            instagram: instagramService,
            facebook: null, // Placeholder
            linkedin: null,
            twitter: null,
            tiktok: null,
            youtube: null,
            telegram: null,
            discord: null,
            reddit: null,
            pinterest: null,
            bluesky: null
        };
    }

    // ========== OAUTH ==========

    getAuthUrl(platform: string, userId: string): string {
        const state = Buffer.from(JSON.stringify({ userId, platform })).toString('base64');
        const service = this.platforms[platform];

        if (!service) {
            throw new Error(`Platform ${platform} not supported or not implemented yet`);
        }

        return service.getAuthUrl(state);
    }

    async handleCallback(platform: string, code: string, state: string): Promise<any> {
        try {
            const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
            const service = this.platforms[platform];

            if (!service) {
                throw new Error(`Platform ${platform} not supported`);
            }

            // Get access token
            const tokenData = await service.getAccessToken(code);

            // Get account info
            const accountInfo = await service.getAccountInfo(tokenData.access_token);

            // Encrypt and store tokens
            const encryptedToken = encryptToken(tokenData.access_token);
            const encryptedRefresh = tokenData.refresh_token
                ? encryptToken(tokenData.refresh_token)
                : null;

            // Save to database
            const query = `
        INSERT INTO social_accounts (
          user_id, platform, platform_user_id, platform_username, platform_name,
          avatar_url, access_token, token_iv, token_auth_tag, refresh_token,
          token_expires_at, scopes, account_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (user_id, platform, platform_user_id) 
        DO UPDATE SET
          access_token = $7,
          token_iv = $8,
          token_auth_tag = $9,
          refresh_token = $10,
          token_expires_at = $11,
          is_active = true,
          updated_at = NOW()
        RETURNING *
      `;

            const values = [
                userId,
                platform,
                accountInfo.id,
                accountInfo.username,
                accountInfo.name,
                accountInfo.avatar,
                encryptedToken.encrypted,
                encryptedToken.iv,
                encryptedToken.authTag,
                encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
                tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
                tokenData.scopes || [],
                accountInfo
            ];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            console.error('OAuth callback error:', error);
            throw error;
        }
    }

    // ========== ACCOUNT MANAGEMENT ==========

    async getConnectedAccounts(userId: string, platform: string | null = null): Promise<any[]> {
        const query = platform
            ? 'SELECT * FROM social_accounts WHERE user_id = $1 AND platform = $2 AND is_active = true'
            : 'SELECT * FROM social_accounts WHERE user_id = $1 AND is_active = true';

        const params = platform ? [userId, platform] : [userId];
        const result = await pool.query(query, params);

        return result.rows.map((account: any) => ({
            id: account.id,
            platform: account.platform,
            username: account.platform_username,
            name: account.platform_name,
            avatar: account.avatar_url,
            connectedAt: account.created_at
        }));
    }

    async disconnectAccount(userId: string, accountId: string): Promise<void> {
        await pool.query(
            'UPDATE social_accounts SET is_active = false WHERE id = $1 AND user_id = $2',
            [accountId, userId]
        );
    }

    // ========== TOKEN MANAGEMENT ==========

    async getValidToken(accountId: string): Promise<{ accessToken: string, platformData: any }> {
        const result = await pool.query(
            'SELECT * FROM social_accounts WHERE id = $1',
            [accountId]
        );

        if (!result.rows[0]) {
            throw new Error('Account not found');
        }

        const account = result.rows[0];

        // Decrypt token
        const token = decryptToken({
            encrypted: account.access_token,
            iv: account.token_iv,
            authTag: account.token_auth_tag
        });

        // Check if expired
        if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
            // Try to refresh
            if (account.refresh_token) {
                return await this.refreshToken(accountId);
            } else {
                throw new Error('Token expired. Please reconnect account.');
            }
        }

        return {
            accessToken: token,
            platformData: account.account_data
        };
    }

    async refreshToken(accountId: string): Promise<{ accessToken: string, platformData: any }> {
        const result = await pool.query(
            'SELECT * FROM social_accounts WHERE id = $1',
            [accountId]
        );

        const account = result.rows[0];
        const service = this.platforms[account.platform];
        
        if (!service) throw new Error(`Platform ${account.platform} not supported for refresh`);

        const refreshTokenData = JSON.parse(account.refresh_token);
        const refreshToken = decryptToken(refreshTokenData);

        const newTokenData = await service.refreshAccessToken(refreshToken);

        // Update in database
        const encryptedToken = encryptToken(newTokenData.access_token);

        await pool.query(`
      UPDATE social_accounts
      SET 
        access_token = $1,
        token_iv = $2,
        token_auth_tag = $3,
        token_expires_at = $4,
        updated_at = NOW()
      WHERE id = $5
    `, [
            encryptedToken.encrypted,
            encryptedToken.iv,
            encryptedToken.authTag,
            new Date(Date.now() + newTokenData.expires_in * 1000),
            accountId
        ]);

        return {
            accessToken: newTokenData.access_token,
            platformData: account.account_data
        };
    }

    // ========== PUBLISHING ==========

    async publishPost(postId: string, platform: string, accountId: string): Promise<any> {
        try {
            // Get post data
            const postResult = await pool.query(
                'SELECT * FROM posts WHERE id = $1',
                [postId]
            );
            const post = postResult.rows[0];

            // Get media URLs
            const mediaResult = await pool.query(`
        SELECT m.cdn_url, m.file_type, m.width, m.height
        FROM media m
        JOIN post_media pm ON m.id = pm.media_id
        WHERE pm.post_id = $1
        ORDER BY pm.sort_order
      `, [postId]);

            const mediaUrls = mediaResult.rows.map((m: any) => m.cdn_url);

            // Get valid token
            const { accessToken, platformData } = await this.getValidToken(accountId);

            // Get service
            const service = this.platforms[platform];
             if (!service) throw new Error(`Platform ${platform} not supported for publishing`);

            // Prepare post data
            const postData = {
                caption: post.caption,
                mediaUrls: mediaUrls,
                contentType: post.content_type,
                platformSpecific: post.platform_specific_data?.[platform] || {}
            };

            // Publish
            const result = await service.publishPost(
                { ...platformData, accessToken },
                postData
            );

            // Update post with platform ID
            const currentPlatformIds = post.platform_post_ids || {};
            const currentPlatformUrls = post.platform_urls || {};

            currentPlatformIds[platform] = result.id;
            currentPlatformUrls[platform] = result.url;

            await pool.query(`
        UPDATE posts
        SET
          platform_post_ids = $1,
          platform_urls = $2,
          published_at = COALESCE(published_at, NOW()),
          status = CASE
            WHEN array_length(platforms, 1) = (
              SELECT COUNT(*) FROM jsonb_object_keys($1::jsonb)
            ) THEN 'published'
            ELSE 'partial'
          END
        WHERE id = $3
      `, [
                JSON.stringify(currentPlatformIds),
                JSON.stringify(currentPlatformUrls),
                postId
            ]);

            return result;

        } catch (error: any) {
            // Log error for this platform
            await this.logError(postId, platform, error);
            throw error;
        }
    }

    async logError(postId: string, platform: string, error: any): Promise<void> {
        const result = await pool.query(
            'SELECT errors FROM posts WHERE id = $1',
            [postId]
        );

        const currentErrors = result.rows[0]?.errors || {};
        currentErrors[platform] = {
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        };

        await pool.query(
            'UPDATE posts SET errors = $1, status = $2 WHERE id = $3',
            [JSON.stringify(currentErrors), 'failed', postId]
        );
    }

    // ========== ANALYTICS ==========

    async fetchAnalytics(postId: string, platform: string): Promise<any> {
        const postResult = await pool.query(
            'SELECT platform_post_ids FROM posts WHERE id = $1',
            [postId]
        );

        const platformPostId = postResult.rows[0]?.platform_post_ids?.[platform];
        if (!platformPostId) {
            throw new Error('Post not published on this platform');
        }

        // Get account
        const accountResult = await pool.query(`
      SELECT sa.* FROM social_accounts sa
      JOIN posts p ON p.user_id = sa.user_id
      WHERE p.id = $1 AND sa.platform = $2
      LIMIT 1
    `, [postId, platform]);

        const account = accountResult.rows[0];
        const { accessToken } = await this.getValidToken(account.id);

        const service = this.platforms[platform];
         if (!service) throw new Error(`Platform ${platform} not supported for analytics`);
         
        const insights = await service.getPostInsights(platformPostId, accessToken);

        // Save to database
        await pool.query(`
      INSERT INTO post_analytics (
        post_id, platform, platform_post_id,
        likes, comments, shares, saves, views, impressions, reach
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (post_id, platform, fetched_at)
      DO UPDATE SET
        likes = $4, comments = $5, shares = $6, saves = $7,
        views = $8, impressions = $9, reach = $10
    `, [
            postId,
            platform,
            platformPostId,
            insights.likes || 0,
            insights.comments || 0,
            insights.shares || 0,
            insights.saves || insights.saved || 0,
            insights.views || 0,
            insights.impressions || 0,
            insights.reach || 0
        ]);

        return insights;
    }
}

export default new SocialMediaService();
