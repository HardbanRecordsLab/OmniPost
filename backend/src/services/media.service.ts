import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
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

class MediaService {
  private uploadDir: string;
  private maxImageSize: number;
  private maxVideoSize: number;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.maxImageSize = 10 * 1024 * 1024; // 10MB
    this.maxVideoSize = 1024 * 1024 * 1024; // 1GB
    
    // Ensure upload directory exists
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

      if (!isImage && !isVideo) {
        throw new Error('Only images and videos are supported');
      }

      // Validate file size
      if (isImage && file.size > this.maxImageSize) {
        throw new Error('Image too large. Max size: 10MB');
      }

      if (isVideo && file.size > this.maxVideoSize) {
        throw new Error('Video too large. Max size: 1GB');
      }

      // Generate unique filename
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const filepath = path.join(this.uploadDir, filename);

      let metadata: MediaMetadata = {};
      let thumbnailFilename: string | null = null;

      if (isImage) {
        // Process image
        const imageInfo = await sharp(file.buffer).metadata();
        
        metadata = {
          width: imageInfo.width,
          height: imageInfo.height,
          format: imageInfo.format
        };

        // Save original
        await sharp(file.buffer).toFile(filepath);

        // Create thumbnail
        thumbnailFilename = `thumb-${filename}`;
        await sharp(file.buffer)
          .resize(400, 400, { fit: 'inside' })
          .toFile(path.join(this.uploadDir, thumbnailFilename));

      } else if (isVideo) {
        // Save video
        await fs.writeFile(filepath, file.buffer);

        // TODO: Extract video metadata using ffprobe
        // For now, basic metadata
        metadata = {
          duration: undefined,
          codec: undefined
        };

        // TODO: Generate video thumbnail using ffmpeg
      }

      // Save to database
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
        thumbnailFilename ? `/uploads/${thumbnailFilename}` : null
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  }

  /**
   * Delete media file
   */
  async deleteMedia(userId: string, mediaId: string): Promise<{ success: boolean }> {
    try {
      // Get media info
      const result = await pool.query(
        'SELECT * FROM media WHERE id = $1 AND user_id = $2',
        [mediaId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Media not found');
      }

      const media = result.rows[0];

      // Delete files
      const filepath = path.join(this.uploadDir, media.storage_key);
      await fs.unlink(filepath).catch(err => console.error('File delete error:', err));

      if (media.thumbnail_url) {
        const thumbPath = path.join(this.uploadDir, path.basename(media.thumbnail_url));
        await fs.unlink(thumbPath).catch(err => console.error('Thumbnail delete error:', err));
      }

      // Delete from database
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
      return media; // Only optimize images
    }

    const platformSpecs: any = {
      instagram: {
        maxWidth: 1440,
        maxHeight: 1800,
        quality: 85
      },
      facebook: {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 85
      },
      twitter: {
        maxWidth: 4096,
        maxHeight: 4096,
        quality: 85
      },
      linkedin: {
        maxWidth: 1200,
        maxHeight: 627,
        quality: 90
      }
    };

    const spec = platformSpecs[platform] || platformSpecs.instagram;
    
    const sourcePath = path.join(this.uploadDir, media.storage_key);
    const optimizedFilename = `${platform}-${media.storage_key}`;
    const optimizedPath = path.join(this.uploadDir, optimizedFilename);

    await sharp(sourcePath)
      .resize(spec.maxWidth, spec.maxHeight, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: spec.quality })
      .toFile(optimizedPath);

    return {
      ...media,
      cdn_url: `/uploads/${optimizedFilename}`
    };
  }

  /**
   * Get CDN URL for media
   */
  getCdnUrl(media: any): string {
    // For local storage
    return `${process.env.BACKEND_URL || 'http://localhost:3001'}${media.cdn_url}`;
  }

  /**
   * Validate media for platform
   */
  validateMediaForPlatform(media: any, platform: string, contentType: string): { valid: boolean; error?: string } {
    const specs: any = {
      instagram: {
        image: {
          maxSize: 8 * 1024 * 1024,
          formats: ['jpg', 'jpeg', 'png'],
          aspectRatio: { min: 0.8, max: 1.91 }
        },
        video: {
          maxSize: 100 * 1024 * 1024,
          formats: ['mp4', 'mov'],
          maxDuration: 60,
          aspectRatio: { min: 0.8, max: 1.91 }
        },
        reel: {
          maxSize: 1024 * 1024 * 1024,
          formats: ['mp4', 'mov'],
          maxDuration: 90,
          aspectRatio: { min: 0.5625, max: 0.5625 } // 9:16
        }
      },
      tiktok: {
        video: {
          maxSize: 4 * 1024 * 1024 * 1024,
          formats: ['mp4', 'mov', 'webm'],
          maxDuration: 600, // 10 minutes
          minResolution: { width: 720, height: 1280 }
        }
      }
    };

    const platformSpec = specs[platform];
    if (!platformSpec) return { valid: true };

    const typeSpec = platformSpec[contentType];
    if (!typeSpec) return { valid: true };

    // Validate size
    if (media.file_size > typeSpec.maxSize) {
      return {
        valid: false,
        error: `File too large for ${platform}. Max: ${typeSpec.maxSize / (1024 * 1024)}MB`
      };
    }

    // Validate format
    const ext = path.extname(media.filename).substring(1).toLowerCase();
    if (!typeSpec.formats.includes(ext)) {
      return {
        valid: false,
        error: `Format not supported for ${platform}. Allowed: ${typeSpec.formats.join(', ')}`
      };
    }

    return { valid: true };
  }
}

export const mediaService = new MediaService();
