import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc } from 'fast-check';
import { pool } from '../../backend/src/db';
import { schedulerService } from '../../backend/src/services/scheduler.service';

// Feature: social-command-center-pro, Property 13: Scheduler Back-Fill Window
// Validates: Requirements 13.2
describe('Scheduler Back-Fill Window Property Test', () => {
  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM queue_jobs WHERE 1=1');
    await pool.query('DELETE FROM posts WHERE 1=1');
    await pool.query('DELETE FROM social_accounts WHERE 1=1');
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM queue_jobs WHERE 1=1');
    await pool.query('DELETE FROM posts WHERE 1=1');
    await pool.query('DELETE FROM social_accounts WHERE 1=1');
  });

  it('should process all scheduled posts within 24-hour window on startup', async () => {
    // Property: Generate arbitrary posts with scheduledAt in past 24h and status 'scheduled'
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          id: fc.uuid(),
          userId: fc.string(),
          platforms: fc.array(fc.constantFrom('instagram', 'facebook', 'twitter', 'linkedin')),
          scheduledAt: fc.date({
            min: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            max: new Date() // now
          })
        }), { minLength: 1, maxLength: 10 }),
        async (testPosts) => {
          // Arrange: Insert test posts into database
          for (const post of testPosts) {
            await pool.query(`
              INSERT INTO posts (id, user_id, platforms, status, scheduled_at, content, created_at, updated_at)
              VALUES ($1, $2, $3, 'scheduled', $4, $5, NOW(), NOW())
            `, [
              post.id,
              post.userId,
              post.platforms,
              post.scheduledAt.toISOString(),
              `Test content for ${post.id}`
            ]);

            // Create mock social accounts for each platform
            for (const platform of post.platforms) {
              await pool.query(`
                INSERT INTO social_accounts (id, user_id, platform, platform_user_id, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, true, NOW(), NOW())
              `, [
                `${post.id}-${platform}`,
                post.userId,
                platform,
                `test_user_${platform}`
              ]);
            }
          }

          // Mock the schedulePost method to track calls
          const originalSchedulePost = schedulerService.schedulePost;
          const schedulePostSpy = vi.fn();
          schedulerService.schedulePost = schedulePostSpy;

          // Act: Perform back-fill sweep
          await schedulerService.performBackFillSweep();

          // Restore original method
          schedulerService.schedulePost = originalSchedulePost;

          // Assert: All posts within 24-hour window should be processed
          expect(schedulePostSpy).toHaveBeenCalledTimes(testPosts.length);
          
          // Verify each post was called with correct ID
          for (const post of testPosts) {
            expect(schedulePostSpy).toHaveBeenCalledWith(
              post.id,
              post.scheduledAt.toISOString()
            );
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ignore posts older than 24 hours', async () => {
    // Property: Generate posts older than 24 hours and verify they are ignored
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          id: fc.uuid(),
          userId: fc.string(),
          platforms: fc.array(fc.constantFrom('instagram', 'facebook')),
          scheduledAt: fc.date({
            min: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
            max: new Date(Date.now() - 25 * 60 * 60 * 1000)  // 25 hours ago
          })
        }), { minLength: 1, maxLength: 5 }),
        async (oldPosts) => {
          // Arrange: Insert old posts into database
          for (const post of oldPosts) {
            await pool.query(`
              INSERT INTO posts (id, user_id, platforms, status, scheduled_at, content, created_at, updated_at)
              VALUES ($1, $2, $3, 'scheduled', $4, $5, NOW(), NOW())
            `, [
              post.id,
              post.userId,
              post.platforms,
              post.scheduledAt.toISOString(),
              `Old test content for ${post.id}`
            ]);
          }

          // Mock the schedulePost method
          const originalSchedulePost = schedulerService.schedulePost;
          const schedulePostSpy = vi.fn();
          schedulerService.schedulePost = schedulePostSpy;

          // Act: Perform back-fill sweep
          await schedulerService.performBackFillSweep();

          // Restore original method
          schedulerService.schedulePost = originalSchedulePost;

          // Assert: No old posts should be processed
          expect(schedulePostSpy).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should ignore posts with status other than scheduled', async () => {
    // Property: Generate posts with different statuses and verify only 'scheduled' are processed
    const statuses = ['draft', 'published', 'failed', 'publishing'];
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          id: fc.uuid(),
          userId: fc.string(),
          platforms: fc.constantFrom(['instagram']),
          scheduledAt: fc.date({
            min: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            max: new Date()
          }),
          status: fc.constantFrom(...statuses)
        }), { minLength: 1, maxLength: 5 }),
        async (testPosts) => {
          // Arrange: Insert posts with various statuses
          for (const post of testPosts) {
            await pool.query(`
              INSERT INTO posts (id, user_id, platforms, status, scheduled_at, content, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `, [
              post.id,
              post.userId,
              post.platforms,
              post.status,
              post.scheduledAt.toISOString(),
              `Test content for ${post.id}`
            ]);
          }

          // Mock the schedulePost method
          const originalSchedulePost = schedulerService.schedulePost;
          const schedulePostSpy = vi.fn();
          schedulerService.schedulePost = schedulePostSpy;

          // Act: Perform back-fill sweep
          await schedulerService.performBackFillSweep();

          // Restore original method
          schedulerService.schedulePost = originalSchedulePost;

          // Assert: Only posts with 'scheduled' status should be processed
          const scheduledPosts = testPosts.filter(p => p.status === 'scheduled');
          expect(schedulePostSpy).toHaveBeenCalledTimes(scheduledPosts.length);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
