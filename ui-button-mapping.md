# UI & Button Mapping

## 1. Calendar View (`calendar-view.tsx`)
**State**: Local `mockPosts`. **No API Integration.**

| Button/Control | Action | Internal Logic | API Trigger |
| :--- | :--- | :--- | :--- |
| **Prev/Next Month** (`<`) (`>`) | Navigate Month | Updates `currentDate` state. | None |
| **Today** | Reset Date | Sets `currentDate` to `new Date()`. | None |
| **View Mode** (Month/Week/Day) | Toggle View | Updates `viewMode` state. | None |
| **New Post** (+ Button) | Open Editor | Calls `onCreatePost` prop -> `setIsPostEditorOpen(true)` in `page.tsx`. | None |
| **Post Item** (Click) | None | Drag/Drop logic exists (`onDragStart` implied by state). | None |

## 2. Queue View (`queue-view.tsx`)
**State**: Local `mockQueuePosts`. **No API Integration.**

| Button/Control | Action | Internal Logic | API Trigger |
| :--- | :--- | :--- | :--- |
| **Platform Toggles** (Insta, FB, etc.) | Filter List | Updates `selectedPlatforms` state. Filters local array. | None |
| **Sort Buttons** (Date, Status, Platform) | Sort List | Updates `sortBy` state. Reorders local array. | None |
| **Post Menu** (...) | Open Dropdown | Visual only. | None |
| **Menu: Preview** | None | No handler. | None |
| **Menu: Edit** | None | No handler. | None |
| **Menu: Duplicate** | None | No handler. | None |
| **Menu: Delete** | None | No handler. | None |

## 3. Campaign Wizard (`campaign-wizard.tsx`)
**State**: Local `mockGeneratedPosts`. **No API Integration.**

| Button/Control | Action | Internal Logic | API Trigger |
| :--- | :--- | :--- | :--- |
| **Topic Input** | Input | Updates `topic` state. | None |
| **Platform Toggles** | Select | Updates `selectedPlatforms` state. | None |
| **Next / Back** | Navigation | Updates `step` state (1 <-> 2 <-> 3). | None |
| **Generate AI Posts** | Generate | Sets `isGenerating`. Simulates progress (0-100%). Populates `generatedPosts` with mocks. | None (Simulated) |
| **Include in campaign** (Checkbox) | Select Post | Updates `selectedPosts` array. | None |
| **Schedule Selected** | Complete | Calls `onComplete` prop -> switches view to `calendar`. | None |

## Shared Components
- **Sidebar**: Navigates views (`setActiveView`).
- **Header**: Theme toggle (`isDark`), Create Post.
- **PostEditorModal**: Form to create posts. (Need to verify if this calls `api.createPost`).
