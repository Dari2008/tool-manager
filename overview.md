# ToolManager — Overview

## Quick Start

```bash
cd server
npm install
npm run dev      # tsx watch — hot-reload on http://localhost:3000
npm run build    # tsc → dist/
npm start        # node dist/src/server.js
```

---

## Architecture

```
ToolManager/
├── server/
│   ├── src/               # Express + TypeScript server
│   ├── plugins/           # Plugin implementations (server-side)
│   └── data/              # JSON + image files (runtime data)
├── client/                # Web client served as static files (URL: /client/*)
├── overview.md
└── create-plugin.md
```

### How the app works

1. The Express server serves the client at `/client/*` and all data APIs at `/api/*`.
2. Plugins are TypeScript classes discovered at startup from `server/plugins/<name>/index.ts`.
3. The client is a single-page app with a tab bar at the top (one tab per plugin + a root Gallery tab).
4. Each plugin's tool UI runs inside an `<iframe>` and communicates with the shell via `postMessage`.

---

## Folder Structure

```
server/
├── src/
│   ├── config/index.ts              # Paths, PORT, UUID_REGEX
│   ├── types/index.ts               # All TypeScript interfaces
│   ├── utils/
│   │   ├── errors.ts                # send404/400/409/500
│   │   ├── fileSystem.ts            # readJson, writeJson, listFiles, ensureDir, …
│   │   ├── validation.ts            # isValidUuid
│   │   ├── logger.ts                # Timestamped color-coded console log + request middleware
│   │   └── folderRegistry.ts        # Discovers settings/ and images/ subfolders at startup
│   ├── services/
│   │   ├── crudService.ts           # Generic getAll / getOne / create / update / delete
│   │   ├── jobDeletionService.ts    # Cascade delete with atomic backup + rollback
│   │   └── pluginConfigService.ts   # Reads/writes data/plugin-config.json
│   ├── plugins/
│   │   └── loader.ts                # Dynamically imports every folder in /plugins at startup
│   └── routes/
│       ├── jobs.ts                  # /api/jobs — CRUD + ?rawImage= filter
│       ├── dynamic.ts               # /api/settings/:folder — CRUD for all discovered folders
│       ├── images.ts                # /api/images/:folder — upload / serve / delete
│       ├── listItems.ts             # /api/listItems/get?folder= — sidebar item source
│       ├── gallery.ts               # /api/gallery/get?folder= + /api/gallery/all
│       ├── pluginSettings.ts        # /api/plugins/settings/get|set — per-job plugin settings
│       └── pluginsMeta.ts           # /api/plugins — metadata + enable/disable + global settings
│
├── plugins/
│   ├── raw/index.ts                 # RawPlugin — gallery-only (hasSidebar=false)
│   └── shopProductImage/index.ts   # ShopProductImagePlugin — tool with sidebar + gallery
│
└── data/
    ├── settings/
    │   ├── raw/<uuid>.json
    │   └── shopProductImage/<uuid>.json
    ├── images/
    │   ├── raw/<uuid>.jpg
    │   └── shopProductImage/<uuid>.jpg
    ├── jobs/<uuid>.json
    └── plugin-config.json           # Plugin enabled state + global settings

client/                              # Served at /client/* (URL prefix)
├── index.html                       # App shell
├── css/
│   ├── style.css                    # Shell styles (tabs, sidebar, layout, gallery, modals)
│   └── plugin-base.css              # Shared styles for plugin iframes
├── js/
│   ├── app.js                       # App shell logic (tabs, sidebar, jobs, gallery, settings)
│   └── gallery.js                   # Reusable Gallery class for plugin iframes
└── plugins/
    ├── raw/
    │   ├── index.html               # Pure gallery UI with upload button
    │   ├── style.css
    │   └── loader.js                # Sidebar item renderer (unused for raw — no sidebar)
    └── shopProductImage/
        ├── index.html               # Tool view + Gallery tab
        ├── style.css
        └── loader.js                # Sidebar item renderer for raw images
```

---

## Data Model

### Job (`data/jobs/<uuid>.json`)

```ts
interface Job {
  id: string;
  imageSettings: string;             // plugin folder name (which plugin owns this job)
  rawImage: string[];                // source image URL(s) associated with this job
  settings?: Record<string, Record<string, unknown>>; // job.settings[pluginName][key]
}
```

### SettingEntry (`data/settings/<folder>/<uuid>.json`)

```ts
interface SettingEntry {
  id: string;
  image: string[];                   // filenames of associated images
  settings: Record<string, unknown>; // creation settings
}
```

### ListItem (sidebar items returned by `getListItems`)

```ts
interface ListItem {
  uuid: string;
  type: "image" | string;
  label: string;
  url?: string;
  thumbnail?: string;
  meta?: Record<string, unknown>;
}
```

### GalleryItem (items returned by `getGalleryItems`)

```ts
interface GalleryItem {
  uuid: string;
  filename: string;
  url: string;
  thumbnail: string;
  meta?: Record<string, unknown>;
}
```

---

## API Endpoints

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs?rawImage=<url>` | Filter by source image |
| GET | `/api/jobs/:uuid` | Get one job |
| POST | `/api/jobs` | Create a job |
| PUT | `/api/jobs/:uuid` | Update a job |
| DELETE | `/api/jobs/:uuid` | Cascade-delete job + all referenced files |

### Settings (dynamic)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/:folder` | List all entries |
| GET | `/api/settings/:folder/:uuid` | Get one entry |
| POST | `/api/settings/:folder` | Create an entry |
| PUT | `/api/settings/:folder/:uuid` | Update an entry |
| DELETE | `/api/settings/:folder/:uuid` | Delete an entry |

### Images

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/images/:folder` | List all images |
| GET | `/api/images/:folder/:uuid` | Stream image file |
| POST | `/api/images/:folder` | Upload (`multipart/form-data`, field `image`) |
| DELETE | `/api/images/:folder/:uuid` | Delete image |

### List Items (sidebar)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/listItems/get?folder=<name>` | Get sidebar items (calls `plugin.getListItems()`) |

### Gallery

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/gallery/get?folder=<name>` | Gallery items for one plugin |
| GET | `/api/gallery/all` | All plugins' items, grouped with section headers |

### Plugin Settings (per-job)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/plugins/settings/get?jobId=<uuid>&plugin=<name>` | Load plugin settings from a job |
| POST | `/api/plugins/settings/set` body `{jobId, plugin, settings}` | Save/merge plugin settings into a job |

### Plugin Metadata & Config

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/plugins` | List all plugins with full metadata |
| GET | `/api/plugins/:folder/config` | Get enabled state + global settings |
| PATCH | `/api/plugins/:folder/config` | Set enabled or globalSettings |

---

## Plugin System

### ProcessPlugin interface

```ts
interface ProcessPlugin {
  folder: string;

  // Hides sidebar and disables job management (pure gallery plugin)
  hasSidebar?: boolean;              // default: true

  // Appears in the root Gallery's right-click "Open in…" menu
  canReceiveExternalItem?: boolean;  // default: false

  // CRUD overrides (optional — falls back to filesystem CRUD)
  getAll?(req: Request): Promise<unknown>;
  getOne?(req: Request, uuid: string): Promise<unknown>;
  create?(req: Request, body: unknown): Promise<unknown>;
  update?(req: Request, uuid: string, body: unknown): Promise<unknown>;
  delete?(req: Request, uuid: string): Promise<void>;

  // Sidebar items (source images the user drags into the tool)
  getListItems?(req: Request): Promise<ListItem[]>;

  // Gallery items (output images the plugin has generated)
  getGalleryItems?(req: Request): Promise<GalleryItem[]>;

  // Global settings schema — fields rendered in the ⚙ settings modal
  globalSettingsSchema?: GlobalSettingField[];

  // Register additional Express routes
  registerRoutes?(app: Express): void | Promise<void>;
}
```

### Plugin types

| Type | hasSidebar | canReceiveExternalItem | Description |
|------|-----------|----------------------|-------------|
| Tool | `true` | optional | Has sidebar, job tabs, drag-drop |
| Gallery-only | `false` | `false` | Pure gallery, no jobs, no sidebar |
| Receiver | `true` | `true` | Tool that can be opened from root Gallery |

---

## Client — Tab Bar

The top bar has one tab per plugin (in load order) plus a special **Gallery** tab at the start.

- **Gallery tab** — shows all generated images from all plugins, grouped by plugin with section headers. Supports bulk export and right-click → "Open in X tool" (only for plugins with `canReceiveExternalItem = true`).
- **Plugin tabs** — each opens that plugin's iframe. Disabled plugins are greyed out.
- **⚙ gear button** (top-right) — opens the global settings for the currently active plugin.

## Client — Sidebar

Visible only when the active plugin has `hasSidebar = true`. Shows **source/input** items returned by `getListItems()`. Items are draggable — dropping one onto the tool area creates a new **Job sub-tab**.

Custom rendering: each plugin can ship `client/plugins/<name>/loader.js` exporting `render(item)` to produce a custom element. The shell makes it draggable automatically.

## Client — Job Sub-Tabs

A second tab bar (below the plugin tabs) shows open jobs for the current plugin.

- Each job tab has a label (the dragged image's filename) and a × close button.
- A dot (•) appears when the job has unsaved changes (`dirty-state`).
- Closing a dirty job prompts the user to save first.
- Jobs are created by dragging an item from the sidebar onto the tool area.

## Client — Root Gallery

`GET /api/gallery/all` returns all enabled plugins' generated images grouped by plugin. The root gallery renders each group under a section header, with checkboxes for bulk selection and ZIP export (using JSZip via CDN).

Right-clicking a gallery card shows an "Open in…" menu for every enabled plugin where `canReceiveExternalItem = true`. Selecting a tool activates that plugin's tab and opens a new job pre-loaded with the selected image.

## Client — Plugin Global Settings

`PATCH /api/plugins/<folder>/config` body `{ enabled, globalSettings }` persists to `data/plugin-config.json`. Fields are auto-rendered from the plugin's `globalSettingsSchema`. Changes take effect immediately without a server restart.

---

## Job Cascade Delete

`DELETE /api/jobs/:uuid`:
1. Reads the job to collect all referenced UUIDs.
2. Backs up every file to `.delete-backups/`.
3. Deletes: job JSON + referenced settings + referenced image files.
4. If any step fails → restores all backups (atomic rollback).
5. On success → removes backup files.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Express 4 | HTTP server |
| TypeScript 5 (strict) | Language |
| tsx watch | Dev hot-reload (ESM-native) |
| tsc | Production build |
| multer 2 | Multipart image uploads |
| uuid 14 | UUID generation |
| JSZip (CDN) | Client-side ZIP export |
| Node.js 20+ | Runtime |

Module system: **ES Modules** (`"type": "module"`, `"module": "NodeNext"`).
