# Implementation Plan: Social Command Center Pro

## Overview

Extend OmniPost into a full-featured social media command centre supporting 200+ platforms via a Session Vault (AES-256-GCM cookies), a Puppeteer Automation Engine (10 key platforms), and a Smart Launcher (190+ platforms via clipboard + browser open). Supporting features include AI content variants, drag-and-drop calendar, media library, analytics scraper, link manager, and scheduler reliability improvements.

Each task builds on the previous. All code lives in the existing monorepo structure (`backend/src/`, `src/platforms/`, `app/components/`).

---

## Tasks

- [x] 1. Database schema migrations
  - [x] 1.1 Create new tables: `session_vault`, `platform_configs`, `publish_log`, `analytics_snapshots`, `tracked_links`, `link_clicks`
    - Write a new migration SQL file at `backend/src/db/migrations/001_social_command_center.sql`
    - Include all `CREATE TABLE` statements, indexes, and constraints from the design data models section
    - Include `CONSTRAINT max_3_per_platform UNIQUE (user_id, platform, label)` on `session_vault`
    - _Requirements: 1.1, 1.2, 2.1, 5.1, 10.1, 11.1_

  - [x] 1.2 Alter existing `posts` and `media` tables
    - Add `platform_variants JSONB`, `platform_post_ids JSONB`, `platform_urls JSONB`, `analytics_status VARCHAR(32)`, `retry_count INTEGER`, `errors JSONB` to `posts`
    - Extend `post_status` enum with `'publishing'`, `'posted'`, `'failed'`, `'launched'`
    - Add `tags TEXT[]` and `folder VARCHAR(128)` to `media`
    - _Requirements: 3.1, 8.1, 12.1_

  - [x] 1.3 Update `backend/src/db/schema.sql` to reflect the full current schema
    - Append all new DDL so the canonical schema file stays in sync
    - _Requirements: all data model requirements_

- [x] 2. Session Vault service
  - [x] 2.1 Create `backend/src/services/session-vault.service.ts` with `SessionVaultService` class
    - Implement `storeEntry`, `getDecryptedCookies`, `listEntries`, `deleteEntry` using existing `encryptToken`/`decryptToken` from `backend/src/utils/encryption.ts`
    - Enforce per-platform limit of 3 in `storeEntry` (query COUNT before insert; throw HTTP 409 if >= 3)
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [x] 2.2 Write property test for cookie encryption round trip (Property 1)
    - **Property 1: Cookie Encryption Round Trip**
    - **Validates: Requirements 1.1, 1.6**
    - Use `fc.array(fc.record({ name: fc.string(), value: fc.string(), domain: fc.string(), path: fc.string() }))` as generator
    - File: `scripts/tests/session-vault.property.test.ts`

  - [x] 2.3 Implement `captureSession` and `pollCaptureResult` in `SessionVaultService`
    - Spawn headless:false Puppeteer browser, navigate to `loginUrl`, poll `page.cookies()` every 2 s for up to 5 min
    - On timeout close browser and return `{ error: 'capture_timeout' }`
    - On success call `storeEntry` internally
    - _Requirements: 1.4, 1.5_

  - [x] 2.4 Write property test for per-platform vault limit (Property 2)
    - **Property 2: Per-Platform Vault Limit**
    - **Validates: Requirements 1.2, 1.3**
    - Generate up to 10 `storeEntry` calls for the same (user, platform); assert DB count never exceeds 3
    - File: `scripts/tests/session-vault.property.test.ts`

  - [x] 2.5 Add Session Vault API routes at `backend/src/routes/vault.ts`
    - `POST /api/vault/capture`, `GET /api/vault/capture/:sessionId`, `GET /api/vault`, `DELETE /api/vault/:entryId`
    - Register routes in `backend/src/main.ts` under prefix `/api/vault`
    - _Requirements: 1.1–1.5_

- [x] 3. Platform Registry expansion
  - [x] 3.1 Extend `PlatformConfig` interface and `PlatformRegistry` class in `src/platforms/adapters/PlatformRegistry.ts`
    - Add `PlatformConfig` interface (id, displayName, baseUrl, loginUrl, postUrl, adapterType, toneCategory, charLimit, category, supportsHashtags)
    - Add `configs: Map<string, PlatformConfig>` field; implement `registerConfig`, `getConfig`, `listByCategory`, `listAll`, `validateConfig`
    - `validateConfig` must return `{ valid: false }` for missing/empty `id`, `displayName`, or `baseUrl`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Write property test for platform config validation invariant (Property 3)
    - **Property 3: Platform Config Validation Invariant**
    - **Validates: Requirements 2.4**
    - Generate arbitrary configs with one required field blanked; assert `validateConfig` returns `valid: false`
    - File: `scripts/tests/platform-registry.property.test.ts`

  - [x] 3.3 Create `src/platforms/registry.json` with 200+ platform entries
    - Include all platforms from the design: 10 Puppeteer platforms + 190+ Smart Launcher entries
    - Each entry must conform to `PlatformConfig` shape
    - Load this file at startup in `AdapterLoader.getRegistry()` via `registerConfig` calls
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Add Platform Registry API routes at `backend/src/routes/platforms.ts`
    - `GET /api/platforms`, `POST /api/platforms`, `PATCH /api/platforms/:id`
    - Register in `backend/src/main.ts` under prefix `/api/platforms`
    - _Requirements: 2.1–2.4_

- [x] 4. Anti-Ban System
  - [x] 4.1 Create `src/platforms/adapters/base/AntiBanSystem.ts`
    - Implement `humanType` (randomised per-keystroke delay 800–4000 ms via `page.keyboard.type` with per-char delay)
    - Implement `humanClick` (Bézier curve mouse path before `page.click`)
    - Implement `shuffleFieldOrder`, `getRandomUserAgent` (pool of 10+ realistic UA strings)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.2 Implement Redis rate window in `AntiBanSystem`
    - `checkCoolDown(platform, userId)`: sorted-set key `anti_ban:{userId}:{platform}`, count entries in last 3600 s; return `1800000` if > 5, else `0`
    - `recordPublish(platform, userId)`: ZADD current timestamp to sorted set, EXPIRE 7200 s
    - _Requirements: 5.4_

  - [x] 4.3 Write property test for anti-ban cool-down enforcement (Property 14)
    - **Property 14: Anti-Ban Cool-Down Enforcement**
    - **Validates: Requirements 5.4**
    - Generate > 5 publish events in a 1-hour window; assert `checkCoolDown` returns ≥ 1,800,000
    - File: `scripts/tests/anti-ban.property.test.ts`

- [x] 5. Puppeteer Automation Engine
  - [x] 5.1 Create abstract base class `src/platforms/adapters/base/PuppeteerAdapter.ts`
    - Extend `BaseAdapter`; inject `AntiBanSystem`
    - Implement `publish` as template method: restore cookies → `navigateToPostPage` → `detectLoginChallenge` → `fillPostContent` → `submitPost` → close browser
    - Browser lifecycle: fresh `puppeteer.launch()` per attempt; `finally` block with `Promise.race` 30 s timeout to force-close
    - _Requirements: 3.1, 3.2, 3.3, 5.1_

  - [x] 5.2 Implement concrete Puppeteer adapters for 10 key platforms
    - Create adapters in `src/platforms/adapters/` for: Instagram, Facebook, TikTok, LinkedIn, YouTube, Twitter/X, Reddit, Pinterest, Telegram, Discord
    - Each implements `navigateToPostPage`, `fillPostContent`, `submitPost`, `detectLoginChallenge`
    - Register each in `AdapterLoader.getRegistry()` replacing the existing API-based adapters
    - _Requirements: 3.1–3.4_

  - [x] 5.3 Write unit tests for adapter interface invariant (Property 8)
    - **Property 8: Adapter Interface Invariant**
    - **Validates: Requirements 15.4**
    - For each registered adapter, assert `validateContent` returns `{ valid: false }` for whitespace-only content
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` as generator
    - File: `scripts/tests/adapters.property.test.ts`

- [x] 6. Smart Launcher
  - [x] 6.1 Create `src/platforms/adapters/base/SmartLauncherAdapter.ts`
    - Implement `SmartLauncherAdapter extends BaseAdapter`
    - `publish`: write `post.content` to clipboard via `clipboardy`, open `platformConfig.postUrl` via `open` package
    - Return `{ externalId: 'launched' }` as `PublishResult`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.2 Create `backend/src/services/smart-launcher.service.ts` with `SmartLauncherService`
    - `launch(post, platformId)`: delegates to `SmartLauncherAdapter`; returns `LaunchResult`
    - `launchMultiple(post, platformIds)`: sequential with 3 s delay between each platform
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.3 Write property test for Smart Launcher sequential delay (Property 9)
    - **Property 9: Smart Launcher Sequential Delay**
    - **Validates: Requirements 4.4**
    - Generate arbitrary list of N > 1 platforms; assert total elapsed time ≥ (N-1) * 3000 ms
    - File: `scripts/tests/smart-launcher.property.test.ts`

  - [x] 6.4 Register all 190+ Smart Launcher platforms in `AdapterLoader.getRegistry()`
    - For each platform in `registry.json` with `adapterType: 'smart_launcher'`, instantiate `SmartLauncherAdapter` with its config
    - _Requirements: 4.1, 4.2_

- [x] 7. Checkpoint — core publishing pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. AI Content Engine extension
  - [x] 8.1 Add `TONE_PROFILES` constant and `ToneProfile` interface to `backend/src/services/ai.service.ts`
    - Define 6 tone profiles: professional, casual, provocative, crypto, forum, short_form
    - Each profile has `name`, `platforms[]`, `systemPrompt`, `exampleStyle`
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Implement `generatePlatformVariants` method on `AIService`
    - Accept `baseContent: string`, `targetPlatforms: string[]`, optional `{ timeoutMs?: number }`
    - For each platform: look up `ToneProfile` via `PlatformRegistry.getConfig`, call `callGemini` with tone-specific system prompt
    - Use existing `requestWithTimeout` with 15 s per-platform timeout; on failure return `{ content: baseContent, ... }` for that platform
    - Return `PlatformVariant[]` with `platformId`, `content`, `hashtags`, `charCount`, `toneProfile`
    - _Requirements: 6.1–6.6_

  - [x] 8.3 Write property test for AI variant character limit (Property 4)
    - **Property 4: AI Variant Character Limit**
    - **Validates: Requirements 6.3**
    - Generate arbitrary base content + platform with defined `charLimit`; assert `variant.content.length <= charLimit`
    - File: `scripts/tests/ai-content.property.test.ts`

  - [x] 8.4 Write property test for AI fallback on failure (Property 5)
    - **Property 5: AI Fallback on Failure**
    - **Validates: Requirements 6.6**
    - Simulate timeout for arbitrary platform; assert returned `content === baseContent`
    - File: `scripts/tests/ai-content.property.test.ts`

  - [x] 8.5 Implement `generateHashtagsForPlatform` method on `AIService`
    - Accept `content: string`, `platform: string`; return `string[]` with 5–15 hashtags
    - Reuse existing `generateHashtags` logic; enforce count bounds (slice to 15, pad to 5 if needed)
    - _Requirements: 6.7, 7.1_

  - [x] 8.6 Write property test for hashtag count bounds (Property 6)
    - **Property 6: Hashtag Count Bounds**
    - **Validates: Requirements 6.7, 7.1**
    - Generate arbitrary post content; assert returned hashtag array length is in [5, 15]
    - File: `scripts/tests/ai-content.property.test.ts`

  - [x] 8.7 Add AI Content Engine API routes to `backend/src/routes/ai.ts`
    - `POST /api/ai/variants` → `generatePlatformVariants`
    - `POST /api/ai/hashtags` → `generateHashtagsForPlatform`
    - Register in `backend/src/main.ts`
    - _Requirements: 6.1–6.7_

- [x] 9. Drag-and-drop Content Calendar
  - [x] 9.1 Install `@dnd-kit/core` and `@dnd-kit/sortable` in `app/package.json`
    - Add dependencies; update `app/package.json`
    - _Requirements: 7.1, 7.2_

  - [x] 9.2 Extend `app/components/calendar-view.tsx` with drag-and-drop
    - Wrap calendar with `<DndContext>`; make each post card a `<Draggable>` with `postId` as data
    - Make each calendar cell a `<Droppable>` with `{ date, time }` as data
    - On drop: call `PATCH /api/posts/:id/reschedule` with `{ scheduledAt }` and apply optimistic UI update with rollback on error
    - Render yellow border on drop targets outside publishing windows; show confirmation dialog before API call
    - _Requirements: 7.1–7.5_

  - [x] 9.3 Add `PATCH /api/posts/:id/reschedule` endpoint to `backend/src/routes/posts.ts`
    - Accept `{ scheduledAt: ISO8601 }`, validate format, call `schedulerService.reschedulePost`
    - _Requirements: 7.3, 7.4_

- [x] 10. Media Library extension
  - [x] 10.1 Extend `backend/src/services/media.service.ts`
    - Add GIF and WebP to accepted MIME types
    - Raise unified size cap to 500 MB; return HTTP 413 if exceeded
    - Add `listMedia(userId, { type?, search?, page?, limit? })` method with SQL ILIKE search on filename/tags
    - Add `attachMediaToPost(postId, mediaId)` inserting into `post_media` join table
    - Add `deleteMedia` cascade check: query `post_media` for unpublished posts, return `affectedPosts[]` before deleting
    - _Requirements: 8.1–8.6_

  - [x] 10.2 Add video thumbnail generation using `fluent-ffmpeg`
    - In `media.service.ts` upload handler, if file is video, extract frame at 1 s and store as thumbnail
    - _Requirements: 8.3_

  - [x] 10.3 Create `app/components/media-library-view.tsx`
    - Grid layout with filter bar (type, search input, folder selector)
    - Calls `GET /api/media` with query params; renders thumbnails with select/attach/delete actions
    - _Requirements: 8.1, 8.4, 8.5_

  - [x] 10.4 Update Media Library API routes in `backend/src/routes/media.ts`
    - `GET /api/media` with query params, `POST /api/media/upload`, `DELETE /api/media/:id`, `POST /api/media/:id/attach`
    - Register in `backend/src/main.ts`
    - _Requirements: 8.1–8.6_

- [x] 11. Analytics Scraper service
  - [x] 11.1 Create `backend/src/services/analytics-scraper.service.ts` with `AnalyticsScraperService`
    - Implement `scrapePost(postId, platform)`: use `PuppeteerAdapter` infrastructure + session cookies to scrape metrics
    - Implement `handleFailure`: after 3 failures set `analytics_status = 'unavailable'` on the post
    - Store results in `analytics_snapshots` table
    - _Requirements: 10.1–10.4_

  - [x] 11.2 Implement Redis rate limiting in `AnalyticsScraperService`
    - Key `analytics_scrape:{platform}:{userId}` with TTL 1800 s; skip scrape if key exists
    - _Requirements: 10.5_

  - [x] 11.3 Write property test for analytics scrape rate limit (Property 10)
    - **Property 10: Analytics Scrape Rate Limit**
    - **Validates: Requirements 10.5**
    - Generate arbitrary sequence of scrape calls for same (user, platform); assert no two requests within 30-minute window
    - File: `scripts/tests/analytics-scraper.property.test.ts`

  - [x] 11.4 Wire analytics scraping into `SchedulerService`
    - In `createWorker` success handler, replace the `setTimeout` placeholder with a proper BullMQ delayed job that calls `analyticsScraperService.scrapePost` after 1 hour
    - _Requirements: 10.2_

  - [x] 11.5 Add Analytics API routes to `backend/src/routes/analytics.ts`
    - `GET /api/analytics`, `GET /api/analytics/posts/:id`, `POST /api/analytics/scrape/:postId`
    - Register in `backend/src/main.ts`
    - _Requirements: 10.1–10.5_

- [x] 12. Link Manager
  - [x] 12.1 Create `backend/src/services/link-manager.service.ts` with `LinkManagerService`
    - Implement `shortenUrl(userId, originalUrl, customAlias?)`: generate nanoid slug or validate custom alias against `/^[a-zA-Z0-9-]{1,50}$/`; insert into `tracked_links`; throw HTTP 400 on invalid format, HTTP 409 on duplicate slug
    - Implement `recordClick(slug, metadata)`: insert into `link_clicks`, increment `click_count`
    - Implement `getLinkStats(userId, linkId)`: return `TrackedLink` with aggregated click data
    - _Requirements: 11.1–11.5_

  - [x] 12.2 Write property test for link slug uniqueness (Property 11)
    - **Property 11: Link Slug Uniqueness**
    - **Validates: Requirements 11.1, 11.5**
    - Generate N links; assert all slugs are distinct
    - File: `scripts/tests/link-manager.property.test.ts`

  - [x] 12.3 Write property test for custom alias format validation (Property 12)
    - **Property 12: Custom Alias Format**
    - **Validates: Requirements 11.4**
    - Generate arbitrary strings; assert rejected iff contains non-`[a-zA-Z0-9-]` or length > 50
    - File: `scripts/tests/link-manager.property.test.ts`

  - [x] 12.4 Add Link Manager API routes and redirect endpoint to `backend/src/routes/links.ts`
    - `GET /api/links`, `POST /api/links`, `GET /api/links/:id/stats`, `DELETE /api/links/:id`
    - `GET /r/:slug` (no auth): look up slug, call `recordClick`, issue 302 redirect
    - Register in `backend/src/main.ts`
    - _Requirements: 11.1–11.5_

  - [x] 12.5 Create `app/components/link-manager-view.tsx`
    - Table of tracked links with slug, original URL, click count, created date
    - Create link form with URL input and optional custom alias field
    - Click stats panel showing referrer/UA breakdown
    - _Requirements: 11.1–11.5_

- [x] 13. Checkpoint — services and API layer
  - Ensure all tests pass, ask the user if questions arise.

- [-] 14. Scheduler reliability improvements
  - [ ] 14.1 Add startup back-fill sweep to `SchedulerService`
    - On construction, query posts with `status = 'scheduled'` and `scheduled_at` between `NOW() - INTERVAL '24 hours'` and `NOW()`
    - Re-enqueue each via `schedulePost` with `delay: 0`
    - _Requirements: 13.1, 13.2_

  - [~] 14.2 Write property test for scheduler back-fill window (Property 13)
    - **Property 13: Scheduler Back-Fill Window**
    - **Validates: Requirements 13.2**
    - Generate arbitrary posts with `scheduledAt` in past 24 h and status `scheduled`; assert all are processed on startup
    - File: `scripts/tests/scheduler.property.test.ts`

  - [~] 14.3 Add idempotency guards to `SchedulerService`
    - Use `jobId: \`${postId}-${platform}\`` (already present) and add DB-level `ON CONFLICT DO NOTHING` on `queue_jobs` insert
    - Before enqueuing, check if a non-failed job already exists for `(postId, platform)` and skip if so
    - _Requirements: 13.3_

  - [~] 14.4 Implement exponential back-off retry in `SchedulerService`
    - Verify BullMQ `backoff` config uses delays 60 s / 300 s / 900 s for attempts 1/2/3
    - After 3 failures set post `status = 'failed'` and `errors` JSONB (already partially implemented — complete and test)
    - _Requirements: 13.4, 13.5_

- [~] 15. Property-based tests — remaining properties
  - [~] 15.1 Write property test for Post serialisation round trip (Property 7)
    - **Property 7: Post Serialisation Round Trip**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
    - Use `fc.record(...)` with `fc.fullUnicodeString()` for content fields; assert `JSON.parse(JSON.stringify(post))` deep-equals original
    - File: `scripts/tests/post-serialisation.property.test.ts`

  - [~] 15.2 Write property test for Post serialisation with emoji/special chars (Property 7 — edge cases)
    - **Property 7 (edge cases): Post Serialisation Round Trip**
    - **Validates: Requirements 12.1–12.4**
    - Specifically target emoji, RTL text, null bytes stripped by JSON
    - File: `scripts/tests/post-serialisation.property.test.ts`

- [~] 16. Frontend integration — extend existing views
  - [~] 16.1 Extend `app/components/post-editor-modal.tsx` with AI variant panel
    - Add "Generate Variants" button that calls `POST /api/ai/variants`
    - Display per-platform content previews with character count indicators
    - _Requirements: 6.1, 6.2, 6.3_

  - [~] 16.2 Extend `app/components/social-accounts-manager.tsx` with Session Vault UI
    - Add "Capture Session" button per platform that calls `POST /api/vault/capture`
    - Poll `GET /api/vault/capture/:sessionId` and show progress/success/error states
    - List existing vault entries with delete action
    - _Requirements: 1.1–1.5_

  - [~] 16.3 Add new views to `app/app/page.tsx` and `app/components/sidebar.tsx`
    - Register `media-library-view` and `link-manager-view` as navigable views in the sidebar
    - _Requirements: 8.1, 11.1_

  - [~] 16.4 Extend `app/components/analytics-view.tsx` with scraped analytics data
    - Fetch from `GET /api/analytics` and `GET /api/analytics/posts/:id`
    - Show per-platform metrics from `analytics_snapshots` table
    - _Requirements: 10.1–10.4_

- [~] 17. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 7, 13, and 17 ensure incremental validation
- All 14 correctness properties from the design document are covered by property-based tests using `fast-check`
- Property tests live in `scripts/tests/` alongside existing adapter tests, using `{ numRuns: 100 }` minimum
- Each property test file includes a comment: `// Feature: social-command-center-pro, Property N: <property_text>`
