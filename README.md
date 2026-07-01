# Flow Desktop

**Personal Cognitive Operating System**  
Electron + React + TypeScript + SQLite

---

## What this is

Flow is not a task manager. It is an external working memory where:
- Thoughts are captured instantly
- Information connects across shelves (many-to-many)
- Projects emerge naturally from captured items
- Focus is protected through intentional one-thing-at-a-time design

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+ (get from nodejs.org)
- Windows 10/11 or macOS

### Steps

```bash
# 1. Extract the zip and enter the folder
cd flow-desktop

# 2. Install dependencies
npm install

# 3. Run in development mode
npm run dev
```

This opens the Electron app connected to Vite's dev server with hot reload.

---

## Build for Windows (.exe installer)

```bash
# Build distributable Windows installer
npm run build:win
```

Output: `release/Flow Setup 1.0.0.exe`

Install it like any Windows app. Flow will appear in your Start Menu and taskbar.

---

## Build for macOS (.dmg)

```bash
npm run build:mac
```

Output: `release/Flow-1.0.0.dmg`

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Space` | Global quick capture (works even when minimized) |
| `Enter` in capture | Save item |
| `Escape` in capture | Close capture |
| `Tab` in note title | Jump to body |

---

## Architecture

```
flow-desktop/
├── electron/
│   ├── main.ts          # Main process: windows, tray, IPC, global shortcuts
│   └── preload.ts       # Secure bridge: exposes window.flow API to renderer
│
├── src/
│   ├── App.tsx          # Root: routes to MainLayout / CaptureOverlay / Companion
│   ├── db/
│   │   ├── schema.ts    # Type definitions + SQL migration strings
│   │   └── client.ts    # All DB operations (localStorage now, SQLite bridge later)
│   ├── store/
│   │   └── useFlowStore.ts  # Zustand: all app state + actions
│   ├── components/
│   │   ├── MainLayout.tsx   # Shell: sidebar + main + overlays
│   │   ├── Sidebar.tsx      # Always-visible: nav + focus + queue + capture
│   │   ├── TitleBar.tsx     # Custom title bar (frameless window)
│   │   ├── ItemRow.tsx      # Reusable item row with done/focus actions
│   │   ├── ItemDetail.tsx   # Full item panel: type, status, steps, notes, shelves
│   │   ├── CaptureOverlay.tsx  # Quick capture window
│   │   ├── CompanionWidget.tsx # Mini always-on-top widget
│   │   ├── ResurfacePrompt.tsx # "Is this still relevant?" nudge
│   │   └── UndoToast.tsx   # 5-second undo after delete
│   ├── views/
│   │   ├── HomeView.tsx    # Dashboard: focus card, stats, queue, shelf shortcuts
│   │   ├── InboxView.tsx   # Unassigned items + bulk capture
│   │   ├── ShelvesView.tsx # Shelf tree + items + run-focus
│   │   ├── FocusView.tsx   # Full-screen focus: ring timer + steps
│   │   └── NotesView.tsx   # Two-panel note editor
│   └── lib/
│       └── utils.ts        # Time formatting, type colors, greeting
```

---

## Data Model

### Option C Schema (migration-ready from day one)

```sql
items           -- all captured information
shelves         -- folders AND contexts
item_shelves    -- many-to-many junction (one item in multiple shelves)
steps           -- subtasks belonging to an item
notes           -- freeform writing, optionally linked to a shelf
focus_sessions  -- timer history
prefs           -- user preferences
```

**Key design decisions:**
- `item_shelves` junction table means "Buy Timber" can live in both `Make a Table` and `Shopping Today` as a single item
- `repeat_rule` stored as JSON string — supports simple ("daily") and complex (custom intervals) without schema changes
- `progress_current / progress_total / progress_unit` — ready for books, courses, any trackable progress
- Status field: `raw → exploring → active → parked` lifecycle

---

## Features

### 5 Screens
1. **Home** — greeting, focus card, stats, queue, shelf shortcuts
2. **Inbox** — unassigned items, single + bulk capture, due-soon sidebar
3. **Shelves** — hierarchical tree, many-to-many item assignment, Run Focus sequence
4. **Focus** — full-screen with animated ring timer, step checklist, queue strip
5. **Notes** — two-panel editor with word count

### Core Behaviors
- **Global capture**: `Ctrl+Space` anywhere, even when minimized
- **Auto-classification**: TASK / IDEA / PROJECT / REMINDER / NOTE / JOURNAL
- **Time parsing**: "at 4pm", "tomorrow at 8", "in 3 hours", "next Monday" → reminder timestamp
- **Promote to project**: converts an IDEA's steps into shelf items
- **Run Focus sequence**: runs through an entire shelf one item at a time
- **Resurfacing**: items idle 3+ days resurface with "Is this still relevant?"
- **Recurring items**: daily / weekdays / weekly / biweekly / monthly / quarterly / yearly
- **Undo delete**: 5-second toast with restore
- **Companion widget**: mini always-on-top with focus + timer + capture

---

## Upgrading to SQLite (Phase 2)

The data layer is in `src/db/client.ts`. Currently it persists to `localStorage`.

To switch to real SQLite:
1. Add `electron-better-sqlite3` IPC calls in `electron/main.ts`
2. Replace the `load()` / `save()` functions in `client.ts` with IPC calls to main
3. Run the migration strings from `schema.ts` on first launch
4. Data model stays identical — no component changes needed

---

## Phase 2 Ideas

- [ ] SQLite persistence via Electron IPC
- [ ] Drag to reorder items and shelves
- [ ] Item linking (reference one item from another)
- [ ] Progress tracking UI (book pages, course lessons)
- [ ] Consistency tracking for recurring items (5/7 this week)
- [ ] Web Audio alarm engine (6 tones, no audio files)
- [ ] Full-screen alarm overlay
- [ ] Shelf sequence scheduling (auto-advance on timer complete)
- [ ] Export to Markdown
- [ ] Mobile PWA companion (share target API)
- [ ] iCloud / Dropbox sync via file-based SQLite
