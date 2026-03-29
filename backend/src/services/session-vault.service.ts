// backend/src/services/session-vault.service.ts

import crypto from 'crypto';
import { Pool } from 'pg';
import { encryptToken, decryptToken } from '../utils/encryption';

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export interface VaultEntry {
  id: string;
  userId: string;
  platform: string;
  label: string;
  encryptedCookies: string;
  iv: string;
  authTag: string;
  capturedAt: Date;
  lastUsedAt?: Date;
}

type CaptureStatus = 'pending' | 'complete' | 'timeout' | 'error';

interface CaptureSession {
  userId: string;
  platform: string;
  loginUrl: string;
  status: CaptureStatus;
  entryId?: string;
  error?: string;
}

export class SessionVaultService {
  private pool: Pool;
  private captureSessions: Map<string, CaptureSession> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async storeEntry(
    userId: string,
    platform: string,
    label: string,
    cookies: CookieEntry[]
  ): Promise<VaultEntry> {
    // Enforce per-platform limit of 3
    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM session_vault WHERE user_id = $1 AND platform = $2',
      [userId, platform]
    );
    const count = parseInt(countResult.rows[0].count, 10);
    if (count >= 3) {
      const err: any = new Error('Per-platform limit of 3 sessions reached');
      err.statusCode = 409;
      throw err;
    }

    const cookiesJson = JSON.stringify(cookies);
    const encrypted = encryptToken(cookiesJson);
    const id = crypto.randomUUID();

    const result = await this.pool.query(
      `INSERT INTO session_vault (id, user_id, platform, label, encrypted_cookies, iv, auth_tag, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, user_id, platform, label, encrypted_cookies, iv, auth_tag, captured_at, last_used_at`,
      [id, userId, platform, label, encrypted.encrypted, encrypted.iv, encrypted.authTag]
    );

    const row = result.rows[0];
    return this.rowToEntry(row);
  }

  async getDecryptedCookies(
    userId: string,
    platform: string,
    entryId: string
  ): Promise<CookieEntry[]> {
    const result = await this.pool.query(
      'SELECT * FROM session_vault WHERE id = $1',
      [entryId]
    );

    if (result.rows.length === 0) {
      const err: any = new Error('Vault entry not found');
      err.statusCode = 404;
      throw err;
    }

    const row = result.rows[0];
    if (String(row.user_id) !== String(userId)) {
      const err: any = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    const decrypted = decryptToken({
      encrypted: row.encrypted_cookies,
      iv: row.iv,
      authTag: row.auth_tag,
    });

    // Update last_used_at
    await this.pool.query(
      'UPDATE session_vault SET last_used_at = NOW() WHERE id = $1',
      [entryId]
    );

    return JSON.parse(decrypted) as CookieEntry[];
  }

  async listEntries(
    userId: string,
    platform?: string
  ): Promise<Omit<VaultEntry, 'encryptedCookies' | 'iv' | 'authTag'>[]> {
    let query =
      'SELECT id, user_id, platform, label, captured_at, last_used_at FROM session_vault WHERE user_id = $1';
    const params: any[] = [userId];

    if (platform) {
      query += ' AND platform = $2';
      params.push(platform);
    }

    query += ' ORDER BY captured_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      userId: String(row.user_id),
      platform: row.platform,
      label: row.label,
      capturedAt: row.captured_at,
      lastUsedAt: row.last_used_at ?? undefined,
    }));
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM session_vault WHERE id = $1 AND user_id = $2',
      [entryId, userId]
    );
  }

  // ── Task 2.3 ────────────────────────────────────────────────────────────────

  async captureSession(
    userId: string,
    platform: string,
    loginUrl: string
  ): Promise<{ sessionId: string }> {
    const sessionId = crypto.randomUUID();

    this.captureSessions.set(sessionId, {
      userId,
      platform,
      loginUrl,
      status: 'pending',
    });

    // Run capture in background — do not await
    this.runCapture(sessionId).catch(() => {
      // errors are stored in the session map
    });

    return { sessionId };
  }

  async pollCaptureResult(sessionId: string): Promise<{
    status: CaptureStatus;
    entryId?: string;
    error?: string;
  }> {
    const session = this.captureSessions.get(sessionId);
    if (!session) {
      return { status: 'error', error: 'Session not found' };
    }
    return {
      status: session.status,
      entryId: session.entryId,
      error: session.error,
    };
  }

  private async runCapture(sessionId: string): Promise<void> {
    const session = this.captureSessions.get(sessionId)!;

    let puppeteer: any;
    try {
      puppeteer = (await import('puppeteer')).default;
    } catch {
      session.status = 'error';
      session.error =
        'puppeteer is not installed. Run: npm install puppeteer in the backend directory.';
      return;
    }

    let browser: any;
    try {
      browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();
      await page.goto(session.loginUrl);

      const POLL_INTERVAL = 2000;
      const TIMEOUT = 300000;
      const start = Date.now();

      await new Promise<void>((resolve) => {
        const interval = setInterval(async () => {
          try {
            if (Date.now() - start >= TIMEOUT) {
              clearInterval(interval);
              session.status = 'timeout';
              resolve();
              return;
            }

            const cookies: CookieEntry[] = await page.cookies();
            if (cookies.length > 2) {
              clearInterval(interval);
              try {
                const label = new URL(session.loginUrl).hostname;
                const entry = await this.storeEntry(
                  session.userId,
                  session.platform,
                  label,
                  cookies
                );
                session.entryId = entry.id;
                session.status = 'complete';
              } catch (storeErr: any) {
                session.status = 'error';
                session.error = storeErr.message;
              }
              resolve();
            }
          } catch {
            // page may not be ready yet — keep polling
          }
        }, POLL_INTERVAL);
      });
    } catch (err: any) {
      session.status = 'error';
      session.error = err.message;
    } finally {
      if (browser) {
        try {
          await Promise.race([
            browser.close(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('browser close timeout')), 30000)
            ),
          ]);
        } catch {
          // force-kill if close timed out
          try {
            browser.process()?.kill();
          } catch {}
        }
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private rowToEntry(row: any): VaultEntry {
    return {
      id: row.id,
      userId: String(row.user_id),
      platform: row.platform,
      label: row.label,
      encryptedCookies: row.encrypted_cookies,
      iv: row.iv,
      authTag: row.auth_tag,
      capturedAt: row.captured_at,
      lastUsedAt: row.last_used_at ?? undefined,
    };
  }
}

// Singleton export — pool is injected at startup
let _instance: SessionVaultService | null = null;

export function createSessionVaultService(pool: Pool): SessionVaultService {
  if (!_instance) {
    _instance = new SessionVaultService(pool);
  }
  return _instance;
}
