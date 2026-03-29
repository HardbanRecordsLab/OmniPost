import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import socialMediaService from './social-media.service';
import { analyticsScraperService } from './analytics-scraper.service';
import { pool } from '../db';

const connection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null
    });

interface SchedulerQueue extends Queue {
  // Add any specific properties if needed
}

class SchedulerService {
  queues: { [key: string]: Queue };

  constructor() {
    // Create queues for each platform
    this.queues = {
      instagram: this.createQueue('instagram'),
      facebook: this.createQueue('facebook'),
      linkedin: this.createQueue('linkedin'),
      twitter: this.createQueue('twitter'),
      tiktok: this.createQueue('tiktok'),
      youtube: this.createQueue('youtube'),
      telegram: this.createQueue('telegram'),
      discord: this.createQueue('discord'),
      reddit: this.createQueue('reddit'),
      pinterest: this.createQueue('pinterest'),
      bluesky: this.createQueue('bluesky')
    };

    // Start workers
    this.startWorkers();
    
    // Perform startup back-fill sweep
    this.performBackFillSweep();
  }

  createQueue(platform: string): Queue {
    return new Queue(`${platform}-posts`, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000 // Start with 1 minute
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24h
          count: 1000
        },
        removeOnFail: {
          age: 604800 // Keep failed jobs for 7 days
        }
      }
    });
  }

  // ========== BACK-FILL SWEEP ==========

  async performBackFillSweep(): Promise<void> {
    try {
      console.log('[Scheduler] Starting back-fill sweep for missed scheduled posts...');
      
      // Query posts that were scheduled in the past 24 hours but may have been missed
      const result = await pool.query(`
        SELECT id, user_id, platforms, platform_ids, scheduled_at
        FROM posts 
        WHERE status = 'scheduled' 
        AND scheduled_at BETWEEN NOW() - INTERVAL '24 hours' AND NOW()
        ORDER BY scheduled_at ASC
      `);

      const missedPosts = result.rows;
      console.log(`[Scheduler] Found ${missedPosts.length} missed scheduled posts to back-fill`);

      for (const post of missedPosts) {
        try {
          // Re-enqueue with immediate delay (0) to process immediately
          await this.schedulePost(post.id, post.scheduled_at);
          console.log(`[Scheduler] Back-filled post ${post.id} (scheduled: ${post.scheduled_at})`);
        } catch (error) {
          console.error(`[Scheduler] Failed to back-fill post ${post.id}:`, error);
        }
      }

      console.log('[Scheduler] Back-fill sweep completed');
    } catch (error) {
      console.error('[Scheduler] Error during back-fill sweep:', error);
    }
  }

  // ========== SCHEDULING ==========

  async schedulePost(postId: string, scheduledTime?: string): Promise<any[]> {
    try {
      // Get post data
      const result = await pool.query(
        'SELECT * FROM posts WHERE id = $1',
        [postId]
      );
      const post = result.rows[0];

      if (!post) {
        throw new Error('Post not found');
      }

      // Get connected accounts for each platform
      const userId = post.user_id || 'default-user';
      let targetPlatforms: string[] = [];
      
      if (Array.isArray(post.platforms)) {
        targetPlatforms = post.platforms;
      } else if (typeof post.platform_ids === 'string') {
         targetPlatforms = post.platform_ids.split(',').filter(Boolean);
      } else if (typeof post.platforms === 'string') {
         targetPlatforms = post.platforms.split(',').filter(Boolean);
      }

      const accountsResult = await pool.query(`
        SELECT id, platform, platform_user_id
        FROM social_accounts
        WHERE user_id = $1 
        AND platform = ANY($2)
        AND is_active = true
      `, [userId, targetPlatforms]);

      const accounts = accountsResult.rows;

      if (accounts.length === 0) {
        throw new Error('No connected accounts for selected platforms');
      }

      const delay = scheduledTime ? new Date(scheduledTime).getTime() - Date.now() : 0;

      // Schedule job for each platform
      const jobs = [];
      for (const account of accounts) {
        const queue = this.queues[account.platform];
        
        // Idempotency guard: Check if non-failed job already exists
        const existingJobResult = await pool.query(`
          SELECT job_id, status 
          FROM queue_jobs 
          WHERE post_id = $1 AND platform = $2 AND status NOT IN ('failed', 'completed', 'cancelled')
          ORDER BY created_at DESC 
          LIMIT 1
        `, [postId, account.platform]);

        if (existingJobResult.rows.length > 0) {
          const existingJob = existingJobResult.rows[0];
          console.log(`[Scheduler] Skipping duplicate job for post ${postId} on ${account.platform} (existing: ${existingJob.status})`);
          jobs.push({ platform: account.platform, jobId: existingJob.job_id, skipped: true });
          continue;
        }
        
        const job = await queue.add(
          `publish-${account.platform}`,
          {
            postId: postId,
            accountId: account.id,
            userId: post.user_id,
            platform: account.platform
          },
          {
            delay: delay > 0 ? delay : 0,
            jobId: `${postId}-${account.platform}`, // Idempotency
            priority: delay > 0 ? 1 : 10 // Higher priority for immediate posts
          }
        );

        // Track job in database with ON CONFLICT guard
        await pool.query(`
          INSERT INTO queue_jobs (
            post_id, platform, job_id, status, data
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (job_id) DO UPDATE SET
            status = 'waiting',
            updated_at = NOW()
        `, [
          postId,
          account.platform,
          job.id,
          'waiting',
          JSON.stringify({ delay, scheduledTime })
        ]);

        jobs.push({ platform: account.platform, jobId: job.id, skipped: false });
      }

      // Update post status
      await pool.query(
        'UPDATE posts SET status = $1 WHERE id = $2',
        [delay > 0 ? 'scheduled' : 'publishing', postId]
      );

      return jobs;

    } catch (error) {
      console.error('Error scheduling post:', error);
      throw error;
    }
  }

  async cancelScheduledPost(postId: string): Promise<{ success: boolean }> {
    try {
      // Get all jobs for this post
      const result = await pool.query(
        'SELECT job_id, platform FROM queue_jobs WHERE post_id = $1 AND status IN ($2, $3)',
        [postId, 'waiting', 'delayed']
      );

      for (const job of result.rows) {
        const queue = this.queues[job.platform];
        if (queue) {
             const jobInstance = await queue.getJob(job.job_id);
             if (jobInstance) await jobInstance.remove();
        }

        await pool.query(
          'UPDATE queue_jobs SET status = $1 WHERE job_id = $2',
          ['cancelled', job.job_id]
        );
      }

      await pool.query(
        'UPDATE posts SET status = $1 WHERE id = $2',
        ['draft', postId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error cancelling post:', error);
      throw error;
    }
  }

  async reschedulePost(postId: string, newScheduledTime: string): Promise<any> {
    await this.cancelScheduledPost(postId);
    return await this.schedulePost(postId, newScheduledTime);
  }

  // ========== WORKERS ==========

  startWorkers() {
    Object.keys(this.queues).forEach(platform => {
      this.createWorker(platform);
    });
  }

  createWorker(platform: string) {
    const worker = new Worker(
      `${platform}-posts`,
      async (job: Job) => {
        const { postId, accountId, platform: jobPlatform } = job.data;

        console.log(`[${platform}] Processing job ${job.id} for post ${postId}`);

        try {
          // Update job status
          await pool.query(
            'UPDATE queue_jobs SET status = $1, started_at = NOW(), attempts = attempts + 1 WHERE job_id = $2',
            ['active', job.id]
          );

          // Update post status
          await pool.query(
            'UPDATE posts SET status = $1 WHERE id = $2',
            ['publishing', postId]
          );

          // Publish post
          const result = await socialMediaService.publishPost(postId, jobPlatform, accountId);

          // Update job status
          await pool.query(`
            UPDATE queue_jobs 
            SET status = $1, result = $2, completed_at = NOW()
            WHERE job_id = $3
          `, ['completed', JSON.stringify(result), job.id]);

          console.log(`[${platform}] ✅ Successfully published post ${postId}`);

          // Schedule analytics fetch via BullMQ delayed job (after 1 hour)
          await this.scheduleAnalyticsFetch(postId, jobPlatform);

          return result;

        } catch (error: any) {
          console.error(`[${platform}] ❌ Error publishing post ${postId}:`, error);

          // Update job status with error details
          await pool.query(`
            UPDATE queue_jobs
            SET status = $1, error = $2
            WHERE job_id = $3
          `, ['failed', JSON.stringify({
            message: error.message,
            code: error.code,
            stack: error.stack,
            attempt: job.attemptsMade + 1,
            timestamp: new Date().toISOString()
          }), job.id]);

          // Check if this is the last attempt (3 attempts total)
          if (job.attemptsMade >= 2) { // attemptsMade is 0-based, so 2 = 3rd attempt
            // Store error details in posts table
            await pool.query(`
              UPDATE posts 
              SET status = $1, errors = $2, retry_count = COALESCE(retry_count, 0) + 1, updated_at = NOW()
              WHERE id = $3
            `, [
              'failed', 
              JSON.stringify({
                platform,
                message: error.message,
                code: error.code,
                attempts: job.attemptsMade + 1,
                finalError: true,
                timestamp: new Date().toISOString()
              }),
              postId
            ]);
            
            console.error(`[${platform}] 💀 Final failure for post ${postId} after ${job.attemptsMade + 1} attempts`);
          } else {
            // Update retry count in posts table
            await pool.query(`
              UPDATE posts 
              SET retry_count = COALESCE(retry_count, 0) + 1, errors = $2, updated_at = NOW()
              WHERE id = $3
            `, [
              JSON.stringify({
                platform,
                message: error.message,
                code: error.code,
                attempt: job.attemptsMade + 1,
                timestamp: new Date().toISOString(),
                nextRetryDelay: this.calculateRetryDelay(job.attemptsMade)
              }),
              postId
            ]);
            
            const nextDelay = this.calculateRetryDelay(job.attemptsMade);
            console.log(`[${platform}] ⏰ Retry ${job.attemptsMade + 1}/3 failed, next retry in ${nextDelay/1000}s`);
          }

          throw error;
        }
      },
      {
        connection,
        concurrency: this.getConcurrency(platform),
        limiter: this.getRateLimiter(platform)
      }
    );

    // Event handlers
    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
      console.error(`Worker error [${platform}]:`, err);
    });

    return worker;
  }

  // ========== RATE LIMITING ==========

  calculateRetryDelay(attemptMade: number): number {
    // Exponential backoff: 60s, 300s, 900s for attempts 1, 2, 3
    const delays = [60000, 300000, 900000]; // 1min, 5min, 15min
    return delays[attemptMade] || delays[delays.length - 1];
  }

  getConcurrency(platform: string): number {
    const concurrency: { [key: string]: number } = {
      instagram: 5,
      facebook: 5,
      linkedin: 3,
      twitter: 5,
      tiktok: 2,
      youtube: 2,
      telegram: 10,
      discord: 5,
      reddit: 3,
      pinterest: 5,
      bluesky: 5
    };

    return concurrency[platform] || 3;
  }

  getRateLimiter(platform: string): { max: number, duration: number } {
    const limiters: { [key: string]: { max: number, duration: number } } = {
      instagram: { max: 200, duration: 3600000 }, // 200/hour
      facebook: { max: 200, duration: 3600000 },
      linkedin: { max: 100, duration: 86400000 }, // 100/day
      twitter: { max: 1500, duration: 2592000000 }, // 1500/month (free tier)
      tiktok: { max: 6, duration: 60000 }, // 6/minute
      youtube: { max: 6, duration: 86400000 }, // ~6 uploads/day
      telegram: { max: 30, duration: 1000 }, // 30/second
      discord: { max: 50, duration: 1000 },
      reddit: { max: 60, duration: 60000 },
      pinterest: { max: 100, duration: 3600000 },
      bluesky: { max: 300, duration: 3600000 }
    };
    return limiters[platform] || { max: 10, duration: 60000 };
  }

  async scheduleAnalyticsFetch(postId: string, platform: string): Promise<void> {
    const analyticsQueue = new Queue('analytics-scrape', { connection });
    await analyticsQueue.add(
      'scrape-post',
      { postId, platform },
      { delay: 3600000 } // 1 hour
    );
    console.log(`[Scheduler] Queued analytics scrape for post ${postId} on ${platform} (delay: 1h)`);

    // Start a worker to process analytics scrape jobs
    const worker = new Worker(
      'analytics-scrape',
      async (job: Job) => {
        const { postId: pid, platform: plt } = job.data;
        await analyticsScraperService.scrapePost(pid, plt);
      },
      { connection }
    );

    worker.on('error', (err) => {
      console.error('[AnalyticsWorker] Error:', err);
    });
  }
}

export const schedulerService = new SchedulerService();
