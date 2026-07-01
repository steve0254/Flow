// Flow Database Schema — v1
// Option C: junction table from day one, progress fields, JSON repeat rules
// Migration-friendly: only ADD columns/tables, never remove

export const SCHEMA_VERSION = 1

export const MIGRATIONS: Record<number, string> = {
  1: `
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Core items
    CREATE TABLE IF NOT EXISTS items (
      id              TEXT PRIMARY KEY,
      content         TEXT NOT NULL,
      type            TEXT NOT NULL DEFAULT 'TASK',
      status          TEXT NOT NULL DEFAULT 'raw',
      done            INTEGER NOT NULL DEFAULT 0,
      done_at         TEXT,
      notes           TEXT NOT NULL DEFAULT '',
      reminder_at     TEXT,
      scheduled_at    TEXT,
      duration_min    INTEGER,
      repeat_rule     TEXT,        -- JSON: null | {type,interval,unit} | "daily"|"weekly"|etc
      last_reset_at   TEXT,
      progress_current INTEGER,   -- e.g. current page, lessons done
      progress_total   INTEGER,   -- e.g. total pages, total lessons
      progress_unit    TEXT,       -- e.g. "pages", "lessons", "%" 
      is_focus        INTEGER NOT NULL DEFAULT 0,
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Shelves (folders + contexts)
    CREATE TABLE IF NOT EXISTS shelves (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      icon       TEXT NOT NULL DEFAULT '📁',
      parent_id  TEXT REFERENCES shelves(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Many-to-many: one item can live in multiple shelves
    CREATE TABLE IF NOT EXISTS item_shelves (
      item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      shelf_id   TEXT NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
      added_at   TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (item_id, shelf_id)
    );

    -- Steps / subtasks (belong to one item)
    CREATE TABLE IF NOT EXISTS steps (
      id           TEXT PRIMARY KEY,
      item_id      TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      content      TEXT NOT NULL,
      done         INTEGER NOT NULL DEFAULT 0,
      notes        TEXT NOT NULL DEFAULT '',
      reminder_at  TEXT,
      scheduled_at TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Focus sessions
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id               TEXT PRIMARY KEY,
      item_id          TEXT REFERENCES items(id) ON DELETE SET NULL,
      started_at       TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at         TEXT,
      duration_seconds INTEGER,
      completed        INTEGER NOT NULL DEFAULT 0
    );

    -- Notes (rich freeform, linked to a shelf optionally)
    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL DEFAULT '',
      body       TEXT NOT NULL DEFAULT '',
      shelf_id   TEXT REFERENCES shelves(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- User preferences
    CREATE TABLE IF NOT EXISTS prefs (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_items_done       ON items(done);
    CREATE INDEX IF NOT EXISTS idx_items_type       ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_focus      ON items(is_focus);
    CREATE INDEX IF NOT EXISTS idx_items_reminder   ON items(reminder_at);
    CREATE INDEX IF NOT EXISTS idx_items_created    ON items(created_at);
    CREATE INDEX IF NOT EXISTS idx_item_shelves_item  ON item_shelves(item_id);
    CREATE INDEX IF NOT EXISTS idx_item_shelves_shelf ON item_shelves(shelf_id);
    CREATE INDEX IF NOT EXISTS idx_steps_item       ON steps(item_id);
    CREATE INDEX IF NOT EXISTS idx_notes_shelf      ON notes(shelf_id);
  `
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type ItemType   = 'TASK' | 'IDEA' | 'PROJECT' | 'REMINDER' | 'NOTE' | 'JOURNAL'
export type ItemStatus = 'raw' | 'exploring' | 'active' | 'parked' | 'done'

export interface RepeatRule {
  type: 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
  interval?: number   // for custom
  unit?: 'days' | 'weeks' | 'months'  // for custom
}

export interface Item {
  id:               string
  content:          string
  type:             ItemType
  status:           ItemStatus
  done:             number          // 0 | 1
  done_at:          string | null
  notes:            string
  reminder_at:      string | null
  scheduled_at:     string | null
  duration_min:     number | null
  repeat_rule:      string | null   // JSON string
  last_reset_at:    string | null
  progress_current: number | null
  progress_total:   number | null
  progress_unit:    string | null
  is_focus:         number          // 0 | 1
  sort_order:       number
  created_at:       string
  updated_at:       string
  // Joined
  shelf_ids?:       string[]
  steps?:           Step[]
}

export interface Shelf {
  id:         string
  name:       string
  icon:       string
  parent_id:  string | null
  sort_order: number
  created_at: string
}

export interface Step {
  id:           string
  item_id:      string
  content:      string
  done:         number
  notes:        string
  reminder_at:  string | null
  scheduled_at: string | null
  sort_order:   number
  created_at:   string
}

export interface Note {
  id:         string
  title:      string
  body:       string
  shelf_id:   string | null
  created_at: string
  updated_at: string
}

export interface FocusSession {
  id:               string
  item_id:          string | null
  started_at:       string
  ended_at:         string | null
  duration_seconds: number | null
  completed:        number
}
