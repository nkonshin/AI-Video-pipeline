# AI Video Pipeline — Web UI Design Spec

## Overview

Web interface for the AI Video Pipeline — a personal dashboard for managing the full video generation and publishing workflow. Portfolio-grade quality, single user (no auth).

## Design Direction

- **Visual style:** Dark Premium — dark background (#0a0a0f), glassmorphism, gradient glows, indigo/violet palette (#6366f1 → #8b5cf6 → #a78bfa). Inspired by 21st.dev, Raycast.
- **Navigation:** Full sidebar (collapsible) with text labels. Logo + "Video Pipeline" at top, Settings at bottom.
- **Branding:** "Video Pipeline" everywhere, consistent naming.

## Tech Stack

### Frontend
- **React 18+** with TypeScript
- **Vite** — bundler (no SSR needed for personal dashboard)
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — component library (dark theme)
- **React Router** — client-side routing
- **TanStack Query** — server state management, caching
- **Zustand** — lightweight client state (sidebar state, UI preferences)

### Backend
- **FastAPI** — REST API + WebSocket
- **SQLite** via **SQLAlchemy** — metadata storage (videos, scenarios, jobs, settings)
- **Alembic** — database migrations
- **Existing pipeline code** — imported as-is, called from FastAPI endpoints

### Communication
- **REST API** — CRUD operations (videos, scenarios, settings, publishing)
- **WebSocket** (`/ws/pipeline/{job_id}`) — real-time generation progress updates

## Architecture

```
Frontend (localhost:5173)          Backend (localhost:8000)
┌──────────────────────┐          ┌──────────────────────────┐
│  React + Vite        │  REST    │  FastAPI                 │
│  TanStack Query  ────┼─────────►│  /api/videos/*           │
│  React Router        │          │  /api/scenarios/*        │
│  shadcn/ui           │  WS      │  /api/publishing/*       │
│  Zustand         ────┼─────────►│  /api/settings/*         │
└──────────────────────┘          │  /ws/pipeline/{job_id}   │
                                  │                          │
                                  │  ┌──────────────────┐    │
                                  │  │ Pipeline Code    │    │
                                  │  │ (orchestrator,   │    │
                                  │  │  generators,     │    │
                                  │  │  publishers,     │    │
                                  │  │  assembler)      │    │
                                  │  └──────────────────┘    │
                                  │                          │
                                  │  SQLite    File System   │
                                  │  (metadata) (media)      │
                                  └──────────────────────────┘
```

### Data Storage
- **SQLite** — video metadata, job status, scenario records, platform configs, settings. Single file, zero config.
- **File system** (`output/`) — generated images, video clips, audio, final videos. Database stores file paths only.

### Background Jobs
- Video generation runs as a FastAPI background task (or via `asyncio.create_task`).
- Each job has a unique ID, stored in SQLite with status (pending, running, completed, failed).
- Pipeline orchestrator is modified minimally: a callback function reports progress per stage.
- WebSocket endpoint streams progress events: `{ stage: "video_gen", scene: 2, total_scenes: 4, percent: 50 }`.

## Pages

### 1. Dashboard (`/`)
**Purpose:** Overview of pipeline activity and quick actions.

**Sections:**
- **Stats row** (4 cards): Total Videos, Budget Spent (with limit), Published count, Active Jobs count
- **Active Generations:** List of running jobs with real-time progress bars (WebSocket). Shows: video title, content type badge, current stage name, scene progress, percent bar.
- **Recent Videos:** 3-card grid with thumbnail, title, time ago, cost, publish status + platform badges. "View all" link to My Videos.
- **Quick action:** "+ New Video" button in header → navigates to Create Video.

### 2. Create Video (`/create`)
**Purpose:** Configure and launch video generation.

**Layout:** Hybrid form — core settings visible, advanced in collapsible accordions.

**Sections (top to bottom):**
1. **Content Type selector** — 4 cards in a grid:
   - Fruit Soap Opera (🍓) — prefills Семейка Ягодок scenario
   - Character Remix (🎭) — prefills famous character scenario
   - Business Mascot (🏢) — prefills business mascot scenario
   - Custom (✏️) — blank slate, fill everything manually
   - Selecting a type auto-fills: scenes, prompts, default models, TTS voice. User can override any field.
2. **Scenes editor** — ordered list of scene cards, each with:
   - Scene number + name (editable)
   - Image Prompt textarea
   - Voiceover Text textarea
   - Delete button per scene
   - "+ Add Scene" button at bottom
   - Drag-to-reorder (nice-to-have)
3. **Advanced Settings** (accordion panels):
   - **Model Settings** — Image model dropdown (with price), Video model dropdown (with price)
   - **Voice & TTS** — Engine selector (Edge TTS / Replicate), voice dropdown, preview button
   - **Subtitles** — Enable toggle, font, color, position
   - **Publishing** — Toggle per platform, custom caption/hashtags per platform
   - Each accordion shows current value summary when collapsed
4. **Cost Estimate & Launch bar** (sticky bottom):
   - Formula: scenes × (image cost + video cost) + TTS cost
   - Shows estimated total and remaining budget
   - "Generate Video" button (gradient, prominent)

### 3. My Videos (`/videos`)
**Purpose:** Browse, watch, manage all generated videos.

**Layout:** Toggleable grid/list view.

**Features:**
- Thumbnail (from first scene), title, content type badge, date, cost, status badge (Draft/Published/Failed)
- Filters: by content type, by status
- Sort: by date, by cost
- Actions: watch (inline player), download, publish, delete
- Click → detail page (`/videos/:id`): full player, all metadata, scene breakdown, generation log, publication history

### 4. Scenarios (`/scenarios`)
**Purpose:** Manage reusable scenario templates.

**Features:**
- List of saved scenarios: name, type, scene count, last used
- "Create from template" → opens Create Video with pre-filled data
- Inline YAML editor (CodeMirror or Monaco) for advanced editing
- Import/export YAML files
- Auto-save generated scenarios from successful generations

### 5. Publishing (`/publishing`)
**Purpose:** Manage social media platform connections and publication history.

**Sections:**
- **Platform cards** (5): Telegram, Instagram, YouTube, VK, TikTok
  - Connection status indicator (green/red dot)
  - Configure button → modal with credentials/tokens
  - Default hashtags and caption template per platform
- **Publication log:** Table of recent publications with: video title, platform, timestamp, status (success/failed), link to post

### 6. Settings (`/settings`)
**Purpose:** Global configuration.

**Sections:**
- **API Keys** — Replicate API token (masked input with show/hide toggle)
- **Default Models** — Default image model, video model, TTS engine/voice (used as initial values in Create Video)
- **Budget** — Monthly spending limit, current period spend, reset date
- **Output** — Output directory path, storage usage indicator
- **About** — Version info, links to GitHub repo

## API Endpoints

### Videos
- `GET /api/videos` — list all videos (with filters, pagination)
- `GET /api/videos/:id` — video detail with metadata
- `POST /api/videos` — create and start generation (accepts scenario config)
- `DELETE /api/videos/:id` — delete video and associated files
- `POST /api/videos/:id/publish` — publish to selected platforms

### Scenarios
- `GET /api/scenarios` — list scenarios
- `GET /api/scenarios/:id` — scenario detail
- `POST /api/scenarios` — save new scenario
- `PUT /api/scenarios/:id` — update scenario
- `DELETE /api/scenarios/:id` — delete scenario
- `POST /api/scenarios/generate` — auto-generate scenario by type (calls built-in generators)

### Publishing
- `GET /api/publishing/platforms` — list platforms with connection status
- `PUT /api/publishing/platforms/:name` — update platform config
- `GET /api/publishing/log` — publication history
- `POST /api/publishing/test/:name` — test platform connection

### Settings
- `GET /api/settings` — all settings
- `PUT /api/settings` — update settings
- `GET /api/settings/budget` — budget status (spent, limit, remaining)

### WebSocket
- `WS /ws/pipeline/{job_id}` — real-time progress stream

**Event format:**
```json
{
  "job_id": "abc123",
  "stage": "video_gen",
  "stage_label": "Video Generation",
  "scene": 2,
  "total_scenes": 4,
  "percent": 50,
  "message": "Generating video for scene 2...",
  "cost_so_far": 0.35
}
```

**Stages sequence:** `image_gen` → `video_gen` → `tts` → `subtitle` → `assembly` → `publish` → `completed`

## Database Schema (SQLite)

### videos
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| title | TEXT | Video title |
| content_type | TEXT | fruit-soap / character-remix / mascot / custom |
| status | TEXT | pending / running / completed / failed |
| scenario_config | JSON | Full scenario configuration |
| cost | REAL | Total generation cost |
| output_path | TEXT | Path to final video file |
| thumbnail_path | TEXT | Path to thumbnail image |
| created_at | DATETIME | Creation timestamp |
| completed_at | DATETIME | Completion timestamp |
| error_message | TEXT | Error details if failed |

### scenarios
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| name | TEXT | Scenario name |
| content_type | TEXT | Type |
| config | JSON | Full YAML config as JSON |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update |

### publications
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| video_id | TEXT (FK) | Reference to video |
| platform | TEXT | telegram / instagram / youtube / vk / tiktok |
| status | TEXT | success / failed |
| post_url | TEXT | URL to published post |
| published_at | DATETIME | Timestamp |
| error_message | TEXT | Error if failed |

### settings
| Column | Type | Description |
|--------|------|-------------|
| key | TEXT (PK) | Setting key |
| value | JSON | Setting value |

## Project Structure

```
AI-Video-pipeline/
├── pipeline/                    # Existing Python pipeline (unchanged)
├── backend/                     # New: FastAPI backend
│   ├── main.py                  # FastAPI app, CORS, lifespan
│   ├── routers/
│   │   ├── videos.py            # /api/videos endpoints
│   │   ├── scenarios.py         # /api/scenarios endpoints
│   │   ├── publishing.py        # /api/publishing endpoints
│   │   └── settings.py          # /api/settings endpoints
│   ├── ws/
│   │   └── pipeline.py          # WebSocket handler
│   ├── models/
│   │   └── database.py          # SQLAlchemy models + engine
│   ├── services/
│   │   ├── video_service.py     # Business logic: generation, status
│   │   ├── scenario_service.py  # Scenario CRUD + template generation
│   │   ├── publish_service.py   # Publishing orchestration
│   │   └── settings_service.py  # Settings CRUD
│   └── alembic/                 # Database migrations
├── frontend/                    # New: React frontend
│   ├── src/
│   │   ├── App.tsx              # Router setup
│   │   ├── main.tsx             # Entry point
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   ├── ActiveJobs.tsx
│   │   │   │   └── RecentVideos.tsx
│   │   │   ├── create/
│   │   │   │   ├── ContentTypeSelector.tsx
│   │   │   │   ├── SceneEditor.tsx
│   │   │   │   ├── AdvancedSettings.tsx
│   │   │   │   └── CostEstimate.tsx
│   │   │   ├── videos/
│   │   │   │   ├── VideoGrid.tsx
│   │   │   │   └── VideoDetail.tsx
│   │   │   ├── scenarios/
│   │   │   │   └── ScenarioList.tsx
│   │   │   ├── publishing/
│   │   │   │   ├── PlatformCards.tsx
│   │   │   │   └── PublishLog.tsx
│   │   │   └── settings/
│   │   │       └── SettingsForm.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── CreateVideoPage.tsx
│   │   │   ├── VideosPage.tsx
│   │   │   ├── VideoDetailPage.tsx
│   │   │   ├── ScenariosPage.tsx
│   │   │   ├── PublishingPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useApi.ts
│   │   ├── lib/
│   │   │   ├── api.ts           # Axios/fetch wrapper
│   │   │   └── types.ts         # TypeScript types
│   │   └── styles/
│   │       └── globals.css      # Tailwind + custom theme
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── configs/                     # Existing YAML examples
├── output/                      # Generated media files
├── docs/
└── pyproject.toml               # Updated with backend deps
```

## Non-Goals (explicitly out of scope)

- Authentication / multi-user support
- Deployment / Docker / CI/CD (local dev only for now)
- Video editing in browser (trimming, effects)
- AI prompt generation assistance
- Mobile-responsive design (desktop-first, nice-to-have later)
- Drag-and-drop scene reordering (nice-to-have, not required for v1)
