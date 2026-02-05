# Risk Assessment

## Critical Paths

1.  **Scheduler Loop (`scheduler.ts`)**:
    - **Risk**: If the node process dies, scheduling stops. No external process manager (PM2/Docker) configured in visible files.
    - **Concurrency**: `checkAndSchedule` runs every 60s. If `processPost` takes > 60s and we have many posts, the next tick might pick them up again if the database update is slow. *Mitigation exists*: `markAsPublishing` immediately locks the row.

2.  **Frontend-Backend Disconnect**:
    - **Risk**: **HIGH**. The frontend components (`CalendarView`, `QueueView`) are currently using hardcoded `mockPosts` and are **NOT** fetching data from the backend. The backend API is working and seeding data (`db.ts`), but the user sees a static interface. Any backend logic changes will not be visible in the UI.

3.  **Database Migrations**:
    - **Risk**: Schema changes are handled by `try/catch` blocks in `db.ts` (`ALTER TABLE`). This is fragile for production use. If a migration fails silently, queries might break.

4.  **Worker Adapters**:
    - **Risk**: The `PlatformAdapter` interface is simple (`publish(post)`). Real API integrations (OAuth tokens, refresh tokens, rate limits) are significantly more complex. The current `mock` implementation hides the complexity of token management which is missing from the database schema (only `account_info` text field exists).

## Breakage Scenarios

- **Changing Platform Logic**:
    - If `PlatformAdapter` signatures change, `worker.ts` breaks.
    - If `platforms` table `id`s change (e.g., 'twitter' -> 'x'), the frontend `platformColors` map and backend `PlatformManager` mapping will break.

- **Data Persistence**:
    - SQLite is local. If the container/environment is destroyed without volume mapping `../data/omnipost.db`, all data is lost.
