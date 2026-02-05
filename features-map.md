# Feature & API Mapping

## Backend API (`server.ts`)
Running on: `http://0.0.0.0:3001`

| Method | Endpoint | Description | Database Interaction |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health check. | None |
| `GET` | `/api/posts` | Get all posts (scheduled/draft/published). | `SELECT * FROM posts` |
| `POST` | `/api/posts` | Create new post. | `INSERT INTO posts` |
| `DELETE` | `/api/posts/:id` | Delete post. | `DELETE FROM posts` |
| `PUT` | `/api/posts/:id` | Update post content/status. | `UPDATE posts` |
| `GET` | `/api/platforms` | Get platform status. | `SELECT * FROM platforms` |
| `POST` | `/api/platforms/toggle` | Enable/Disable platform. | `UPDATE platforms` |
| `GET` | `/api/settings` | Get system settings. | `SELECT * FROM system_settings` |
| `PUT` | `/api/settings` | Update settings. | `UPSERT system_settings` |
| `POST` | `/api/generate` | Generate AI content. | Proxy to Gemini/Grok (or mock if no key). |

## Database Schema (SQLite)
- **`posts`**: `id`, `content`, `scheduled_at`, `status`, `platform_id`, `campaign_id`, `media_urls`, `platform_ids`, `retry_count`, `last_error`.
- **`platforms`**: `id` (e.g., 'twitter'), `name`, `is_active`, `status`, `account_info`, `settings_json`.
- **`campaigns`**: `id`, `name`, `original_prompt`.
- **`system_settings`**: `key`, `value` (e.g., API keys, instance name).
- **`users`**: `id`, `vps_bridge_url`, `vps_key` (Infrastructure for future use).

## Scheduler & Worker
- **Scheduler** (`scheduler.ts`):
  - **Interval**: 60 seconds.
  - **Job**: Queries `getDuePosts` (status='scheduled' AND time <= now).
  - **Action**: Marks post as 'publishing' (optimistic lock) and calls `processPost`.
- **Worker** (`worker.ts`):
  - **Logic**: `processPost(post)`
  - **Adapters**: `TwitterAdapter`, `LinkedInAdapter`, `GenericAdapter`.
  - **Behavior**: Simulates publishing (500ms delay).
  - **Success**: Updates status to `published`.
  - **Failure**: Updates retry count. If retries < 3, status -> `scheduled`. Else -> `failed`.

## Working Platform Connections
Currently **MOCKED** in `worker.ts`:
- **Twitter**: Simulates success. Fails if content contains "fail_twitter".
- **LinkedIn**: Simulates success.
- **Generic**: Simulates success.
