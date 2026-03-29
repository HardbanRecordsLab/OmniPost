import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import os from 'os';
import { pool } from '../../db';

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

interface MediaMetadata {
  width?: number;
  height?: number;
  format?: string;
  duration?: number;
  codec?: string;
}

interface ListMediaOptions {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/mpeg',
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

class MediaService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log('Created upload directory:', this.uploadDir);
    }
  }

  /**
   * Upload and process media file
   */
  async uploadMedia(userId: string, file: UploadedFile): Promise<any> {
    try {
      const isImage = file.mimetype.startsWith('image/');
      const isVideo = file.mimetype.startsWith('video/');

      if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
        throw new Error('Unsupported file type. Accepted: JPEG, PNG, GIF, WebP, MP4, MOV, WebM, MPEG');
      }

      // Unified 500 MB size cap
      if (file.size > MAX_FILE_SIZE) {
        const err: any = new Error('File exceeds 500 MB limit');
        err.statusCode = 413;
        throw err;
      }

      // Generate unique filename
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const filepath = path.join(this.uploadDir, filename);

      let metadata: MediaMetadata = {};
      let thumbnailFilename: string | null = null;

      if (isImage) {
        const imageInfo = await sharp(file.buffer).metadata();

        metadata = {
          width: imageInfo.width,
          height: imageInfo.height,
          format: imageInfo.format,
        };

        await sharp(file.buffer).toFile(filepath);

        thumbnailFilename = `thumb-${filename}`;
        await sharp(file.buffer)
          .resize(400, 400, { fit: 'inside' })
          .toFile(path.join(this.uploadDir, thumbnailFilename));

      } else if (isVideo) {
        await fs.writeFile(filepath, file.buffer);

        metadata = { duration: undefined, codec: undefined };

        // Generate video thumbnail using fluent-ffmpeg
        try {
          thumbnailFilename = `thumb-${path.basename(filename, ext)}.jpg`;
          const thumbnailPath = path.join(this.uploadDir, thumbnailFilename);

          await this.extractVideoThumbnail(filepath, thumbnailPath);
        } catch (thumbErr) {
          console.error('Video thumbnail generation failed:', thumbErr);
          thumbnailFilename = null;
        }
      }

      const result = await pool.query(`
        INSERT INTO media (
          user_id, filename, original_url, cdn_url, storage_key,
          file_type, mime_type, file_size, width, height, metadata, thumbnail_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        userId,
        file.originalname,
        `/uploads/${filename}`,
        `/uploads/${filename}`,
        filename,
        isImage ? 'image' : 'video',
        file.mimetype,
        file.size,
        metadata.width || null,
        metadata.height || null,
        JSON.stringify(metadata),
        thumbnailFilename ? `/uploads/${thumbnailFilename}` : null,
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  }

  /**
   * Extract a thumbnail frame from a video at 1 second using fluent-ffmpeg
   */
  private async extractVideoThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
    const ffmpeg = (await import('fluent-ffmpeg')).default;

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(1)
        .frames(1)
        .output(thumbnailPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  /**
   * List media with optional filtering and pagination
   */
  async listMedia(userId: string, options: ListMediaOptions = {}): Promise<any[]> {
    const { type, search, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const params: any[] = [userId];
    const conditions: string[] = ['user_id = $1'];

    if (type) {
      params.push(type);
      conditions.push(`file_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(filename ILIKE $${idx} OR $${idx} ILIKE ANY(tags::text[]))`);
    }

    params.push(limit, offset);

    const query = `
      SELECT * FROM media
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Attach a media asset to a post (join table insert)
   */
  async attachMediaToPost(postId: string, mediaId: string): Promise<void> {
    await pool.query(
      'INSERT INTO post_media (post_id, media_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, mediaId]
    );
  }

  /**
   * Delete media file — checks for unpublished posts first
   */
  async deleteMedia(
    userId: string,
    mediaId: string
  ): Promise<{ success: boolean; affectedPosts?: any[] }> {
    try {
      const result = await pool.query(
        'SELECT * FROM media WHERE id = $1 AND user_id = $2',
        [mediaId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Media not found');
      }

      const media = result.rows[0];

      // Check for unpublished posts referencing this media
      const postCheck = await pool.query(`
        SELECT p.id, p.title, p.status
        FROM post_media pm
        JOIN posts p ON p.id = pm.post_id
        WHERE pm.media_id = $1
          AND p.status NOT IN ('posted', 'failed', 'launched')
      `, [mediaId]);

      if (postCheck.rows.length > 0) {
        return { success: false, affectedPosts: postCheck.rows };
      }

      // Safe to delete — remove files
      const filepath = path.join(this.uploadDir, media.storage_key);
      await fs.unlink(filepath).catch(err => console.error('File delete error:', err));

      if (media.thumbnail_url) {
        const thumbPath = path.join(this.uploadDir, path.basename(media.thumbnail_url));
        await fs.unlink(thumbPath).catch(err => console.error('Thumbnail delete error:', err));
      }

      await pool.query('DELETE FROM media WHERE id = $1', [mediaId]);

      return { success: true };

    } catch (error) {
      console.error('Media delete error:', error);
      throw error;
    }
  }

  /**
   * Get media file info
   */
  async getMedia(mediaId: string): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM media WHERE id = $1',
      [mediaId]
    );
    return result.rows[0];
  }

  /**
   * Optimize image for platform
   */
  async optimizeForPlatform(mediaId: string, platform: string): Promise<any> {
    const media = await this.getMedia(mediaId);

    if (media.file_type !== 'image') {
      return media;
    }

    const platformSpecs: any = {
      instagram: { maxWidth: 1440, maxHeight: 1800, quality: 85 },
      facebook:  { maxWidth: 2048, maxHeight: 2048, quality: 85 },
      twitter:   { maxWidth: 4096, maxHeight: 4096, quality: 85 },
      linkedin:  { maxWidth: 1200, maxHeight: 627,  quality: 90 },
    };

    const spec = platformSpecs[platform] || platformSpecs.instagram;

    const sourcePath = path.join(this.uploadDir, media.storage_key);
    const optimizedFilename = `${platform}-${media.storage_key}`;
    const optimizedPath = path.join(this.uploadDir, optimizedFilename);

    await sharp(sourcePath)
      .resize(spec.maxWidth, spec.maxHeight, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: spec.quality })
      .toFile(optimizedPath);

    return { ...media, cdn_url: `/uploads/${optimizedFilename}` };
  }

  /**
   * Get CDN URL for media
   */
  getCdnUrl(media: any): string {
    return `${process.env.BACKEND_URL || 'http://localhost:3001'}${media.cdn_url}`;
  }

  /**
   * Validate media for platform
   */
  validateMediaForPlatform(
    media: any,
    platform: string,
    contentType: string
  ): { valid: boolean; error?: string } {
    const specs: any = {
      instagram: {
        image: {
          maxSize: 8 * 1024 * 1024,
          formats: ['jpg', 'jpeg', 'png'],
          aspectRatio: { min: 0.8, max: 1.91 },
        },
        video: {
          maxSize: 100 * 1024 * 1024,
          formats: ['mp4', 'mov'],
          maxDuration: 60,
          aspectRatio: { min: 0.8, max: 1.91 },
        },
        reel: {
          maxSize: 1024 * 1024 * 1024,
          formats: ['mp4', 'mov'],
          maxDuration: 90,
          aspectRatio: { min: 0.5625, max: 0.5625 },
        },
      },
      tiktok: {
        video: {
          maxSize: 4 * 1024 * 1024 * 1024,
          formats: ['mp4', 'mov', 'webm'],
          maxDuration: 600,
          minResolution: { width: 720, height: 1280 },
        },
      },
    };

    const platformSpec = specs[platform];
    if (!platformSpec) return { valid: true };

    const typeSpec = platformSpec[contentType];
    if (!typeSpec) return { valid: true };

    if (media.file_size > typeSpec.maxSize) {
      return {
        valid: false,
        error: `File too large for ${platform}. Max: ${typeSpec.maxSize / (1024 * 1024)}MB`,
      };
    }

    const ext = path.extname(media.filename).substring(1).toLowerCase();
    if (!typeSpec.formats.includes(ext)) {
      return {
        valid: false,
        error: `Format not supported for ${platform}. Allowed: ${typeSpec.formats.join(', ')}`,
      };
    }

    return { valid: true };
  }
}

export const mediaService = new MediaService();
