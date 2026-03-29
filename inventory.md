# Inventory

## File Structure

### Root
- `apiService.ts`: Legacy API service (Vite-style env vars), likely unused in Next.js app.
- `PROJECT_GUIDE.md`, `SYSTEM_CORE_GUIDE.md`: Documentation.

### Frontend (`/app`)
#### `/app` (App Router)
- `page.tsx`: Main dashboard shell. Manages state (`activeView`, `isPostEditorOpen`).
- `layout.tsx`: Root layout.
- `globals.css`: Global styles (Tailwind).

#### `/components`
- `calendar-view.tsx`: Calendar UI. Uses `mockPosts`.
- `queue-view.tsx`: List of scheduled/published posts. Uses `mockQueuePosts`.
- `campaign-wizard.tsx`: AI Campaign generation wizard. Uses `mockGeneratedPosts`.
- `dashboard-overview.tsx`: Dashboard summary.
- `header.tsx`: App header.
- `sidebar.tsx`: Navigation sidebar.
- `post-editor-modal.tsx`: Modal for creating posts.
- `settings-view.tsx`: Settings form.
- `/ui/*`: Shadcn UI components (Button, Input, Select, etc.).

#### `/lib`
- `api.ts`: API Client. Connects to `http://localhost:3001`. **Note:** Currently not used by main views (Calendar/Queue/Campaign) which rely on mock data.
- `utils.ts`: Utility functions (cn).

### Backend (`/backend`)
- `server.ts`: Fastify server entry point. Defines API routes.
- `db.ts`: SQLite database initialization and query wrapper (`better-sqlite3`).
- `scheduler.ts`: Interval-based scheduler (checks every 60s).
- `worker.ts`: Background job processor for publishing posts.
- `geminiService.ts`: AI service integration (referenced in API but logic in server.ts handles generation).

## Dependencies

### Frontend -> Backend
- **Communication**: HTTP REST API.
- **Base URL**: `http://localhost:3001` (defined in `app/lib/api.ts`).
- **Status**: The API client (`app/lib/api.ts`) is implemented but **disconnected** from the UI components (`CalendarView`, `QueueView`), which currently display hardcoded mock data.

### Backend -> Database
- **Driver**: `better-sqlite3`.
- **File**: `../data/omnipost.db`.
- **Mode**: WAL (Write-Ahead Logging) enabled.

### Backend -> External Platforms
- **Implementation**: Mock Adapters (`TwitterAdapter`, `LinkedInAdapter`, `GenericAdapter`) in `worker.ts`.
- **Real Integration**: None currently active; simulates network delays and random failures.
