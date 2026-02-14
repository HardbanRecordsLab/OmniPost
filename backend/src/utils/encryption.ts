
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Ensure ENCRYPTION_KEY is available and valid
const keyHex = process.env.ENCRYPTION_KEY || '';
if (keyHex.length !== 64) {
    console.warn('Warning: ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes). Using a random key for now (data will be lost on restart).');
}
const ENCRYPTION_KEY = keyHex.length === 64 ? Buffer.from(keyHex, 'hex') : crypto.randomBytes(32);

export interface EncryptedData {
    encrypted: string;
    iv: string;
    authTag: string;
}

/**
 * Encrypt sensitive data (OAuth tokens)
 * @param text - Plain text to encrypt
 * @returns {EncryptedData} - { encrypted, iv, authTag }
 */
export function encryptToken(text: string): EncryptedData {
    const iv = crypto.randomBytes(16); // 16 bytes IV
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

/**
 * Decrypt sensitive data
 * @param encryptedData - { encrypted, iv, authTag }
 * @returns {string} - Decrypted plain text
 */
export function decryptToken(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        ENCRYPTION_KEY,
        Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Generate random state for OAuth
 * @returns {string}
 */
export function generateState(): string {
    return crypto.randomBytes(32).toString('hex');
}
