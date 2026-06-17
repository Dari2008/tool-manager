# Creating a Plugin

A plugin lives in two places:

| Location | Purpose |
|----------|---------|
| `server/plugins/<name>/index.ts` | Server-side TypeScript — data, CRUD overrides, list items, gallery, routes |
| `client/plugins/<name>/` | Client-side HTML/JS/CSS — tool UI (iframe) + optional sidebar loader + optional workflow nodes |

---

## Plugin types

| Type | `hasSidebar` | Description |
|------|-------------|-------------|
| **Tool** | `true` (default) | Has sidebar, job tabs, drag-drop workflow |
| **Gallery-only** | `false` | Pure gallery, no jobs, no sidebar |

---

## 1. Server-side plugin (`server/plugins/<name>/index.ts`)

```ts
import { Request, Express } from "express";
import {
  ProcessPlugin, ListItem, GalleryItem, GlobalSettingField
} from "../../src/types/index.js";

export default class MyPlugin implements ProcessPlugin {
  folder = "myPlugin"; // must match the directory name

  // ── Plugin type ────────────────────────────────────────────────────────
  hasSidebar = true;              // false = gallery-only (no sidebar, no jobs)
  canReceiveExternalItem = false; // true = appears in root Gallery right-click menu

  // ── Global settings schema (rendered in the ⚙ modal) ──────────────────
  globalSettingsSchema: GlobalSettingField[] = [
    {
      key:          "apiKey",
      label:        "API Key",
      type:         "password",
      description:  "Key used to authenticate with the external service.",
      defaultValue: "",
    },
    {
      key:          "maxSize",
      label:        "Max image size (px)",
      type:         "number",
      defaultValue: 2000,
    },
  ];

  // ── Sidebar items (source/input images the user drags into the tool) ───
  // Only used when hasSidebar = true.
  async getListItems(_req: Request): Promise<ListItem[]> {
    return [
      {
        uuid:      "abc-123",
        type:      "image",
        label:     "My Image",
        url:       "/api/images/myPlugin/abc-123",
        thumbnail: "/api/images/myPlugin/abc-123",
      },
    ];
  }

  // ── Gallery items (generated/output images shown in the Gallery tab) ───
  async getGalleryItems(_req: Request): Promise<GalleryItem[]> {
    return [
      {
        uuid:      "abc-123",
        filename:  "abc-123.jpg",
        url:       "/api/images/myPlugin/abc-123",
        thumbnail: "/api/images/myPlugin/abc-123",
      },
    ];
  }

  // ── CRUD overrides (all optional — omit to use default filesystem CRUD) ─
  async getAll(req: Request) { /* … */ }
  async getOne(req: Request, uuid: string) { /* … */ }
  async create(req: Request, body: unknown) { /* … */ }
  async update(req: Request, uuid: string, body: unknown) { /* … */ }
  async delete(req: Request, uuid: string) { /* … */ }

  // ── Custom routes (optional) ───────────────────────────────────────────
  registerRoutes(app: Express): void {
    app.post("/api/myPlugin/process", async (req, res) => {
      res.json({ ok: true });
    });
  }
}
```

The server discovers plugins at startup by scanning `server/plugins/`. No registration needed — drop the folder in and restart.

### Reading global settings inside your plugin

```ts
import { getPluginConfig } from "../../src/services/pluginConfigService.js";

async getListItems(_req: Request): Promise<ListItem[]> {
  const { globalSettings } = await getPluginConfig(this.folder);
  const apiKey = globalSettings["apiKey"] as string;
  // …
}
```

### Enable / disable

```http
PATCH /api/plugins/myPlugin/config
Content-Type: application/json

{ "enabled": false }
```

When disabled, list items and gallery items return `409 Conflict` and the tab is greyed out.

---

## 2. Client-side plugin (`client/plugins/<name>/`)

```
client/plugins/myPlugin/
├── index.html          ← tool UI, loaded in the iframe
├── style.css           ← plugin-specific styles (link plugin-base.css for shared styles)
├── loader.js           ← ES module, renders sidebar items (omit if hasSidebar=false)
└── workflow-nodes.js   ← optional: node definitions for the Workflow editor
```

---

## 3. `loader.js` — sidebar item renderer

Only needed when `hasSidebar = true`. The parent app imports this module dynamically and calls `render(item)` for each sidebar item.

```js
// client/plugins/myPlugin/loader.js

export function render(item) {
  const el = document.createElement("div");

  if (item.thumbnail) {
    const img = document.createElement("img");
    img.src      = item.thumbnail;
    img.alt      = item.label ?? "";
    img.draggable = false;
    el.appendChild(img);
  }

  const span       = document.createElement("span");
  span.textContent = item.label ?? item.uuid.slice(0, 8);
  el.appendChild(span);

  return el;
}
```

The returned element is made `draggable` automatically. Do not set `draggable` yourself or add drag event listeners — the shell handles that.

---

## 4. `index.html` — tool UI (runs inside an iframe)

### Required: load `plugin-base.css`

```html
<link rel="stylesheet" href="/client/css/plugin-base.css">
<link rel="stylesheet" href="/client/plugins/myPlugin/style.css">
```

`plugin-base.css` provides: reset, dark theme tokens, `.view-tabs` / `.view` switcher, gallery grid, settings bar, and button styles.

### Required: signal "ready"

Send this immediately when the page loads so the parent knows the iframe is ready:

```js
window.parent.postMessage({ type: "ready" }, "*");
```

### postMessage protocol

#### Messages you receive from the parent

| `type` | When | Payload |
|--------|------|---------|
| `init` | New item dropped (new job created) | `{ jobId, item: { uuid, url, label } }` |
| `load-job` | User switches to a different job tab | `{ jobId }` |
| `request-save` | User is closing a dirty job tab and chose to save | _(no extra data)_ |

#### Messages you send to the parent

| `type` | When | Payload |
|--------|------|---------|
| `ready` | Page loaded | _(none)_ |
| `dirty-state` | Settings changed (unsaved) | `{ dirty: true }` |
| `saved` | Settings successfully saved | `{ jobId }` |

> **Never pass image bytes through postMessage.** Receive a `uuid` or `url` and fetch the data from the server.

### Minimal tool iframe template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Plugin</title>
  <link rel="stylesheet" href="/client/css/plugin-base.css">
  <link rel="stylesheet" href="/client/plugins/myPlugin/style.css">
</head>
<body>

  <!-- Optional: view tabs if you want Tool | Gallery tabs -->
  <div class="view-tabs">
    <button class="view-tab active" data-view="tool">Tool</button>
    <button class="view-tab"        data-view="gallery">Gallery</button>
  </div>

  <!-- Tool view -->
  <div class="view active" id="view-tool">
    <div id="canvas">Drop an item here</div>
    <div class="settings-bar">
      <div class="setting-group">
        <label for="my-setting">My Setting</label>
        <input id="my-setting" type="text" value="default">
      </div>
      <div class="bar-actions">
        <span class="bar-status" id="status"></span>
        <button class="btn btn-ghost"   id="btn-load">Load</button>
        <button class="btn btn-primary" id="btn-save">Save</button>
      </div>
    </div>
  </div>

  <!-- Gallery view (optional) -->
  <div class="view" id="view-gallery">
    <div id="gallery-container"></div>
  </div>

  <script type="module">
    import { Gallery } from "/client/dist/gallery.js";

    const PLUGIN = "myPlugin";
    let jobId  = null;
    let isDirty = false;

    const gallery = new Gallery(document.getElementById("gallery-container"), PLUGIN);

    // ── View tabs ────────────────────────────────────────────────
    document.querySelectorAll(".view-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        const v = tab.dataset.view;
        document.querySelectorAll(".view-tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
        document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === `view-${v}`));
        if (v === "gallery") gallery.refresh();
      });
    });

    // ── postMessage handler ───────────────────────────────────────
    window.addEventListener("message", async e => {
      const msg = e.data ?? {};
      switch (msg.type) {
        case "init":
          jobId = msg.jobId;
          if (msg.item) showItem(msg.item);
          await loadSettings();
          break;

        case "load-job":
          jobId = msg.jobId;
          await loadSettings();
          break;

        case "request-save":
          await doSave();
          window.parent.postMessage({ type: "saved", jobId }, "*");
          break;
      }
    });

    window.parent.postMessage({ type: "ready" }, "*");

    // ── Item display ─────────────────────────────────────────────
    function showItem(item) {
      // item = { uuid, url, label }
      document.getElementById("canvas").textContent = `Active: ${item.label}`;
    }

    // ── Dirty state ──────────────────────────────────────────────
    function markDirty(dirty) {
      isDirty = dirty;
      window.parent.postMessage({ type: "dirty-state", dirty }, "*");
    }

    document.getElementById("my-setting").addEventListener("change", () => markDirty(true));

    // ── Settings ─────────────────────────────────────────────────
    async function doSave() {
      if (!jobId) return;
      const settings = {
        mySetting: document.getElementById("my-setting").value,
      };
      await fetch("/api/plugins/settings/set", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ jobId, plugin: PLUGIN, settings }),
      });
      markDirty(false);
      setStatus("Saved ✓");
    }

    async function loadSettings() {
      if (!jobId) return;
      const res  = await fetch(`/api/plugins/settings/get?jobId=${jobId}&plugin=${PLUGIN}`);
      const data = await res.json();
      if (data && Object.keys(data).length) {
        document.getElementById("my-setting").value = data.mySetting ?? "default";
      }
      markDirty(false);
    }

    function setStatus(msg) {
      const el = document.getElementById("status");
      el.textContent = msg;
      setTimeout(() => { el.textContent = ""; }, 3000);
    }

    document.getElementById("btn-save").addEventListener("click", async () => {
      await doSave();
      window.parent.postMessage({ type: "saved", jobId }, "*");
    });
    document.getElementById("btn-load").addEventListener("click", loadSettings);
  </script>

</body>
</html>
```

### Gallery-only plugin template

For a plugin with `hasSidebar = false` (no sidebar, no jobs):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Gallery Plugin</title>
  <link rel="stylesheet" href="/client/css/plugin-base.css">
</head>
<body>

  <div class="gallery-toolbar">
    <div class="gallery-toolbar-left">
      <button class="g-btn" id="g-select-all">Select All</button>
      <button class="g-btn" id="g-deselect">Deselect</button>
      <span class="g-count" id="g-count">0 selected</span>
    </div>
    <div class="gallery-toolbar-right">
      <button class="g-btn g-btn-export" id="g-export" disabled>Export</button>
      <button class="g-btn" id="g-refresh">↻</button>
    </div>
  </div>

  <div class="gallery-grid" id="g-grid"></div>

  <script type="module">
    import { Gallery } from "/client/dist/gallery.js";
    const gallery = new Gallery(document.querySelector(".gallery-grid").parentElement, "myPlugin");
    window.parent.postMessage({ type: "ready" }, "*"); // required even for gallery-only
    gallery.refresh();
  </script>

</body>
</html>
```

> Note: For gallery-only plugins, the parent never sends `init` or `load-job`. Calling `gallery.refresh()` directly loads the items from `/api/gallery/get?folder=myPlugin`.

---

## 5. Gallery — `Gallery` class

The reusable `Gallery` class (`/client/dist/gallery.js`) handles rendering, selection, and bulk export inside a plugin iframe's gallery view.

```js
import { Gallery } from "/client/dist/gallery.js";

const gallery = new Gallery(containerElement, "myPlugin");
await gallery.refresh(); // fetches /api/gallery/get?folder=myPlugin and renders
```

The container must have `display:flex; flex-direction:column; flex:1; overflow:hidden` so it fills the view.

---

## 6. Workflow Nodes

Plugins can contribute their own nodes to the **Workflow** editor by creating a `workflow-nodes.js` file in their client folder. This file is automatically discovered and loaded when the Workflow tab is first opened.

### How it works

1. At server startup, the server checks whether `client/plugins/<name>/workflow-nodes.js` exists and sets a `hasWorkflowNodes` flag in the plugin metadata.
2. When the user opens the Workflow tab, the client loads `workflow-nodes.js` **only** for plugins where `hasWorkflowNodes` is `true` — no unnecessary network requests.
3. The file is imported as an ES module. If it exports a default array of node definitions, those nodes are registered in the palette under the plugin's category.
4. Connections between typed ports are validated automatically — e.g. an `image` output cannot connect to a `text` input without a converter node in between.

> **After adding `workflow-nodes.js`**, restart the server so it picks up the new file and sets the flag.

### `workflow-nodes.js` format

Export a **default array** of `SimpleNodeDef` objects:

```js
// client/plugins/myPlugin/workflow-nodes.js

export default [
  {
    type:     "myPlugin/resize",    // unique id — use "pluginName/nodeName" convention
    title:    "Resize Image",
    category: "My Plugin",          // palette group header
    inputs: [
      { key: "image",   name: "Image",   type: "image" },
      { key: "width",   name: "Width",   type: "number", configOnly: true, defaultValue: 512 },
      { key: "height",  name: "Height",  type: "number", configOnly: true, defaultValue: 512 },
    ],
    outputs: [
      { key: "result",  name: "Result",  type: "image" },
    ],
  },

  {
    type:     "myPlugin/convert-to-text",
    title:    "Image → Caption",
    category: "My Plugin",
    inputs:  [{ key: "image",  name: "Image",   type: "image" }],
    outputs: [{ key: "text",   name: "Caption", type: "text"  }],
  },
];
```

### Port types

| `type` | Color | Use for |
|--------|-------|---------|
| `"image"` | Blue | Image URLs / binary image data |
| `"text"` | Green | Strings, captions, labels |
| `"file"` | Amber | Generic file paths/blobs |
| `"boolean"` | Pink | True/false flags |
| `"number"` | Purple | Integers and floats |
| `"json"` | Blue-grey | Arbitrary structured data |
| `"any"` / _(omit `type`)_ | Grey | Connects to any port type |

### Port options

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Internal identifier used in the graph data |
| `name` | `string` | Label shown next to the port |
| `type` | `SimplePortType` | Data type for connection validation (omit for "any") |
| `configOnly` | `boolean` | If `true`, renders as an inline input field with no connection port |
| `defaultValue` | `unknown` | Initial value for config-only fields |

### `configOnly` ports

When `configOnly: true`, the port renders as an editable field inside the node (text box, number spinner) instead of a connection dot. This is how you put static configuration options (like a resize width) directly on a node:

```js
{ key: "quality", name: "Quality %", type: "number", configOnly: true, defaultValue: 85 }
```

### Connection validation

The workflow automatically blocks incompatible connections. Two ports must have the same `type` to connect. The only exception is `"any"` ports (no type set), which accept connections from and to any type.

```
image → image   ✓ allowed
image → text    ✗ blocked (type mismatch — add a converter node)
image → any     ✓ allowed
any   → text    ✓ allowed
```

### Full example with multiple node types

```js
// client/plugins/myPlugin/workflow-nodes.js

export default [
  // Node with typed image in/out + config field
  {
    type:     "myPlugin/process",
    title:    "Process Image",
    category: "My Plugin",
    inputs: [
      { key: "image",   name: "Image",   type: "image" },
      { key: "mode",    name: "Mode",    configOnly: true, defaultValue: "enhance" },
    ],
    outputs: [
      { key: "result",  name: "Result",  type: "image" },
    ],
  },

  // Node that turns an image into structured JSON (e.g. AI detection result)
  {
    type:     "myPlugin/detect",
    title:    "Detect Objects",
    category: "My Plugin",
    inputs:  [{ key: "image",  name: "Image",   type: "image" }],
    outputs: [
      { key: "data",   name: "Detection", type: "json"  },
      { key: "count",  name: "Count",     type: "number" },
    ],
  },

  // Utility: reads a file path from text, outputs a file
  {
    type:     "myPlugin/load-file",
    title:    "Load File",
    category: "My Plugin",
    inputs: [
      { key: "path", name: "Path", type: "text" },
    ],
    outputs: [
      { key: "file", name: "File", type: "file" },
    ],
  },
];
```

---

## 7. Root Gallery & `canReceiveExternalItem`

The top-level **Gallery** tab shows all generated images from all enabled plugins, grouped by plugin. Users can right-click any image to open it in another tool.

To appear in the right-click "Open in…" menu, set:

```ts
canReceiveExternalItem = true;
```

When the user clicks "Open in MyPlugin", the shell:
1. Activates your plugin's tab.
2. Creates a new job with the selected image.
3. Sends `{ type: "init", jobId, item: { uuid, url, label } }` to your iframe.

Your tool should handle this the same as any other `init` — show the image and load settings.

---

## 8. Settings — saving and loading

Job settings are stored in `job.settings[pluginName]`. Each plugin has its own namespace — no risk of conflicts.

### Save

```js
await fetch("/api/plugins/settings/set", {
  method:  "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jobId,
    plugin: "myPlugin",
    settings: { quality: 90, format: "jpeg", activeUuid: "abc-123" },
  }),
});
```

Settings are **merged** — only the keys you send are updated.

### Load

```js
const res  = await fetch(`/api/plugins/settings/get?jobId=${jobId}&plugin=myPlugin`);
const data = await res.json(); // { quality: 90, format: "jpeg", … }
```

**Always call `loadSettings()` in both `init` and `load-job` handlers** so state is restored correctly when:
- A new item is dropped (new job).
- The user switches between open job tabs.

### Job JSON structure

```json
{
  "id": "<job-uuid>",
  "imageSettings": "myPlugin",
  "rawImage": ["/api/images/raw/abc-123"],
  "settings": {
    "myPlugin": {
      "quality": 90,
      "activeUuid": "abc-123"
    }
  }
}
```

---

## 9. Dirty state & close confirmation

The job tab shows a dot (•) when there are unsaved changes. When the user closes a dirty tab, the shell asks them to save first.

To participate correctly:

1. **Mark dirty** whenever settings change:
   ```js
   window.parent.postMessage({ type: "dirty-state", dirty: true }, "*");
   ```

2. **Clear dirty** after a successful save:
   ```js
   window.parent.postMessage({ type: "dirty-state", dirty: false }, "*");
   ```

3. **Handle `request-save`** — sent by the shell when the user confirms save before close:
   ```js
   case "request-save":
     await doSave();
     window.parent.postMessage({ type: "saved", jobId }, "*");
     break;
   ```

4. **Send `saved` after explicit save** (e.g. when the user clicks the Save button):
   ```js
   window.parent.postMessage({ type: "saved", jobId }, "*");
   ```

---

## 10. API reference for plugin code

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/api/plugins/settings/get?jobId=<uuid>&plugin=<name>` | Load plugin settings for a job |
| POST | `/api/plugins/settings/set` | Save/merge settings into a job |
| GET | `/api/plugins/<name>/config` | Read enabled state + global settings |
| PATCH | `/api/plugins/<name>/config` | Update enabled or globalSettings |
| GET | `/api/listItems/get?folder=<name>` | Get sidebar items (calls `getListItems`) |
| GET | `/api/gallery/get?folder=<name>` | Get gallery items (calls `getGalleryItems`) |
| GET | `/api/images/<folder>/<uuid>` | Stream an image file by UUID |
| POST | `/api/jobs` | Create a new job |
| GET | `/api/jobs/<uuid>` | Read a job JSON |

---

## 11. File checklist for a new plugin

**Server** (`server/plugins/<name>/`):
- [ ] `index.ts` — class with `folder`, `hasSidebar`, optional methods

**Client** (`client/plugins/<name>/`):
- [ ] `index.html` — tool or gallery UI; sends `ready`; handles `init`, `load-job`, `request-save`
- [ ] `style.css` — plugin-specific styles (link `plugin-base.css` for base)
- [ ] `loader.js` — exports `render(item)` (only if `hasSidebar = true`)
- [ ] `workflow-nodes.js` — exports default array of `SimpleNodeDef` (optional — adds nodes to Workflow editor)

After adding any server or `workflow-nodes.js` files, restart the server — the plugin is discovered and loaded automatically. Workflow nodes are loaded lazily when the Workflow tab is first opened.
