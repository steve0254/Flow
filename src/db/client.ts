// Flow DB Client
// Runs in-browser: persists to localStorage (web dev) or syncs via IPC (Electron)
// Schema mirrors SQLite exactly so the Electron → SQLite upgrade is a straight port

import type { Item, Shelf, Step, Note, FocusSession, ItemType, RepeatRule, DurationUnit, NotifyStyle, Priority, ShelfColor } from './schema'
export type { Item, Shelf, Step, Note, FocusSession, ItemType, RepeatRule, DurationUnit, NotifyStyle, Priority, ShelfColor }

// ── uid + time ────────────────────────────────────────────────────────────────
export const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const now  = () => new Date().toISOString()
export const nowMs= () => Date.now()

// ── storage ───────────────────────────────────────────────────────────────────
const KEY = 'flow_v1'

interface Store {
  items:          Item[]
  shelves:        Shelf[]
  item_shelves:   { item_id: string; shelf_id: string; added_at: string }[]
  steps:          Step[]
  notes:          Note[]
  focus_sessions: FocusSession[]
  prefs:          Record<string, string>
}

function emptyStore(): Store {
  return { items: [], shelves: [], item_shelves: [], steps: [], notes: [], focus_sessions: [], prefs: {} }
}

function load(): Store {
  try {
    const r = localStorage.getItem(KEY)
    if (r) return { ...emptyStore(), ...JSON.parse(r) }
  } catch {}
  return emptyStore()
}

let S: Store = load()

function save() {
  localStorage.setItem(KEY, JSON.stringify(S))
  // Notify Electron main process so other windows refresh
  const f = (window as any).flow
  if (f?.db?.changed) f.db.changed()
}

export function reloadStore() { S = load() }

// ── classify ──────────────────────────────────────────────────────────────────
export function classify(text: string): ItemType {
  const t = text.toLowerCase()
  if (/remind me|set a reminder|alarm for|wake( me)? (up )?at/i.test(t)) return 'REMINDER'
  if (/\b(idea|concept|what if|imagine|could we|maybe|business idea|content idea)\b/i.test(t)) return 'IDEA'
  if (/\bat\s+\d|\d{1,2}(:\d{2})?\s*(am|pm)\b|\bin\s+\d+\s*(min|hour)|tomorrow at|tonight/i.test(t)) return 'REMINDER'
  if (/\b(project|plan|launch|build|start|create|design|develop)\b/i.test(t)) return 'PROJECT'
  if (/\b(journal|diary|today i|lesson|learned|note:|note to self)\b/i.test(t)) return 'NOTE'
  return 'TASK'
}

// ── time parser ───────────────────────────────────────────────────────────────
export function parseTime(text: string): Date | null {
  const t = text.toLowerCase()
  const now = new Date()
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

  if (/\btomorrow\b/.test(t)) {
    const d = new Date(now); d.setDate(d.getDate() + 1)
    const m = /at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(t)
    if (m) { let h = +m[1], mn = +(m[2]||0); if (m[3]==='pm'&&h<12) h+=12; if (m[3]==='am'&&h===12) h=0; d.setHours(h,mn,0,0) }
    else d.setHours(8,0,0,0)
    return d
  }
  const nextDay = /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.exec(t)
  if (nextDay) {
    const target = days.indexOf(nextDay[1].toLowerCase())
    const d = new Date(now); d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7)); d.setHours(8,0,0,0); return d
  }
  if (/next\s+week/.test(t))  { const d = new Date(now); d.setDate(d.getDate()+7);  d.setHours(8,0,0,0); return d }
  if (/next\s+month/.test(t)) { const d = new Date(now); d.setMonth(d.getMonth()+1);d.setHours(8,0,0,0); return d }

  const inM = /\bin\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(minute|hour|day|week|month)s?\b/i.exec(t)
  if (inM) {
    const wn: Record<string,number> = {a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10}
    const n = isNaN(+inM[1]) ? (wn[inM[1].toLowerCase()]||1) : +inM[1]
    const unit = inM[2].toLowerCase()
    const d = new Date(now)
    if (unit==='minute') d.setMinutes(d.getMinutes()+n)
    else if (unit==='hour') d.setHours(d.getHours()+n)
    else if (unit==='day') d.setDate(d.getDate()+n)
    else if (unit==='week') d.setDate(d.getDate()+n*7)
    else if (unit==='month') d.setMonth(d.getMonth()+n)
    return d
  }
  const atM = /at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(t)
  if (atM) {
    const d = new Date(now); let h = +atM[1], mn = +(atM[2]||0)
    if (atM[3]==='pm'&&h<12) h+=12; if (atM[3]==='am'&&h===12) h=0; d.setHours(h,mn,0,0); return d
  }
  const bare = /(\d{1,2})(?::(\d{2}))?(am|pm)/i.exec(t)
  if (bare) {
    const d = new Date(now); let h = +bare[1], mn = +(bare[2]||0)
    if (bare[3].toLowerCase()==='pm'&&h<12) h+=12; if (bare[3].toLowerCase()==='am'&&h===12) h=0; d.setHours(h,mn,0,0); return d
  }
  if (/\btonight\b|\bthis evening\b/.test(t)) { const d=new Date(now);d.setHours(19,0,0,0);return d }
  if (/\bthis morning\b/.test(t))            { const d=new Date(now);d.setHours(7,0,0,0); return d }
  if (/\bthis afternoon\b/.test(t))          { const d=new Date(now);d.setHours(14,0,0,0);return d }
  return null
}

// ── items ─────────────────────────────────────────────────────────────────────
export const itemsDB = {
  getAll(): Item[] { return S.items },

  getActive(): Item[] {
    return S.items.filter(i => !i.done).sort((a,b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  },

  getFocus(): Item | null { return S.items.find(i => i.is_focus === 1) ?? null },

  getQueue(limit = 6): Item[] {
    return S.items.filter(i => !i.done && !i.is_focus)
      .sort((a,b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .slice(0, limit)
  },

  getById(id: string): Item | null { return S.items.find(i => i.id === id) ?? null },

  getForShelf(shelfId: string): Item[] {
    const ids = new Set(S.item_shelves.filter(r => r.shelf_id === shelfId).map(r => r.item_id))
    return S.items.filter(i => ids.has(i.id)).sort((a,b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  },

  getInbox(): Item[] {
    const assigned = new Set(S.item_shelves.map(r => r.item_id))
    return S.items.filter(i => !assigned.has(i.id) && !i.done)
      .sort((a,b) => b.created_at.localeCompare(a.created_at))
  },

  search(q: string): Item[] {
    const lq = q.toLowerCase()
    return S.items.filter(i => i.content.toLowerCase().includes(lq) || i.notes.toLowerCase().includes(lq))
  },

  getShelfIds(itemId: string): string[] {
    return S.item_shelves.filter(r => r.item_id === itemId).map(r => r.shelf_id)
  },

  getNeglected(daysOld = 3): Item[] {
    const cutoff = new Date(Date.now() - daysOld * 86_400_000).toISOString()
    return S.items.filter(i =>
      !i.done && !i.is_focus && i.created_at < cutoff &&
      (!i.last_reset_at || i.last_reset_at < cutoff)
    )
  },

  create(content: string, type?: ItemType, shelfIds: string[] = []): Item {
    const t = type ?? classify(content)
    const ts = parseTime(content)
    const maxOrder = S.items.reduce((m, i) => Math.max(m, i.sort_order), -1)
    const item: Item = {
      id: uid(), content: content.trim(), type: t, status: 'raw',
      done: 0, done_at: null, notes: '',
      reminder_at:   ts ? ts.toISOString() : null,
      scheduled_at:  ts ? ts.toISOString() : null,
      duration_min: null, repeat_rule: null, last_reset_at: null,
      progress_current: null, progress_total: null, progress_unit: null,
      is_focus: 0, sort_order: maxOrder + 1,
      created_at: now(), updated_at: now(),
      duration_value: null, duration_unit: null, started_at: null,
      milestone_pcts: '[25,50,75]', milestones_fired: '[]',
      notify_style: 'push', remind_before_min: null,
      reminder_fired: 0, snoozed_until: null,
    }
    S.items.push(item)
    shelfIds.forEach(sid => S.item_shelves.push({ item_id: item.id, shelf_id: sid, added_at: now() }))
    save(); return item
  },

  createMany(lines: string[], shelfIds: string[] = []): Item[] {
    return lines.map(l => l.trim()).filter(Boolean).map(l => itemsDB.create(l, undefined, shelfIds))
  },

  update(id: string, updates: Partial<Item>): Item | null {
    const idx = S.items.findIndex(i => i.id === id)
    if (idx === -1) return null
    S.items[idx] = { ...S.items[idx], ...updates, updated_at: now() }
    save(); return S.items[idx]
  },

  markDone(id: string): void {
    const idx = S.items.findIndex(i => i.id === id)
    if (idx === -1) return
    S.items[idx] = { ...S.items[idx], done: 1, done_at: now(), is_focus: 0, updated_at: now() }
    save()
  },

  setFocus(id: string | null): void {
    S.items = S.items.map(i => ({ ...i, is_focus: 0 }))
    if (id) {
      const idx = S.items.findIndex(i => i.id === id)
      if (idx !== -1) { S.items[idx].is_focus = 1; S.items[idx].updated_at = now() }
    }
    save()
  },

  delete(id: string): void {
    S.items = S.items.filter(i => i.id !== id)
    S.item_shelves = S.item_shelves.filter(r => r.item_id !== id)
    S.steps = S.steps.filter(s => s.item_id !== id)
    save()
  },

  setShelfIds(itemId: string, shelfIds: string[]): void {
    S.item_shelves = S.item_shelves.filter(r => r.item_id !== itemId)
    shelfIds.forEach(sid => S.item_shelves.push({ item_id: itemId, shelf_id: sid, added_at: now() }))
    save()
  },

  addToShelf(itemId: string, shelfId: string): void {
    if (!S.item_shelves.find(r => r.item_id === itemId && r.shelf_id === shelfId))
      S.item_shelves.push({ item_id: itemId, shelf_id: shelfId, added_at: now() })
    save()
  },

  removeFromShelf(itemId: string, shelfId: string): void {
    S.item_shelves = S.item_shelves.filter(r => !(r.item_id === itemId && r.shelf_id === shelfId))
    save()
  },

  markSurfaced(id: string): void {
    const idx = S.items.findIndex(i => i.id === id)
    if (idx !== -1) { S.items[idx].last_reset_at = now(); save() }
  },

  resetRecurring(): boolean {
    const n = Date.now(); let changed = false
    S.items.forEach(it => {
      if (!it.repeat_rule || it.done) return
      const rule = it.repeat_rule
      const last = it.last_reset_at ? new Date(it.last_reset_at).getTime() : new Date(it.created_at).getTime()
      const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()
      let should = false
      if (rule === 'daily' && !sameDay(last, n)) should = true
      if (rule === 'weekdays' && !sameDay(last, n) && new Date(n).getDay() >= 1 && new Date(n).getDay() <= 5) should = true
      if (rule === 'weekly') {
        const ws = (d: number) => { const x = new Date(d); x.setDate(x.getDate()-x.getDay()); x.setHours(0,0,0,0); return x.getTime() }
        if (ws(last) !== ws(n)) should = true
      }
      if (should) { it.done = 0; it.last_reset_at = now(); changed = true }
    })
    if (changed) save()
    return changed
  },

  reorder(ids: string[]): void {
    ids.forEach((id, i) => { const idx = S.items.findIndex(it => it.id === id); if (idx !== -1) S.items[idx].sort_order = i })
    save()
  },

  promoteToProject(id: string): Shelf | null {
    const it = itemsDB.getById(id); if (!it) return null
    const sh = shelvesDB.create(it.content, '🚀')
    itemsDB.update(id, { type: 'PROJECT' })
    itemsDB.addToShelf(id, sh.id)
    // Move steps to items in the new shelf
    const itemSteps = stepsDB.getForItem(id)
    itemSteps.forEach(s => {
      itemsDB.create(s.content, 'TASK', [sh.id])
    })
    S.steps = S.steps.filter(s => s.item_id !== id)
    save(); return sh
  },

  // ── execution (duration tracking) ─────────────────────────────────────────
  startExecution(id: string): void {
    itemsDB.update(id, { started_at: now(), milestones_fired: '[]', reminder_fired: 0 })
  },

  resetExecution(id: string): void {
    itemsDB.update(id, { started_at: null, milestones_fired: '[]' })
  },

  markMilestonesFired(id: string, pcts: number[]): void {
    itemsDB.update(id, { milestones_fired: JSON.stringify(pcts) })
  },

  getInProgress(): Item[] {
    return S.items.filter(i => !i.done && i.started_at && i.duration_value)
  },

  // ── reminders ────────────────────────────────────────────────────────────
  getDueReminders(): Item[] {
    const n = now()
    return S.items.filter(i =>
      !i.done && i.reminder_at && i.reminder_at <= n && !i.reminder_fired &&
      (!i.snoozed_until || i.snoozed_until <= n)
    )
  },

  getMissedReminders(graceMinutes = 15): Item[] {
    const cutoff = new Date(Date.now() - graceMinutes * 60_000).toISOString()
    return S.items.filter(i =>
      !i.done && i.reminder_at && i.reminder_at <= cutoff &&
      (!i.snoozed_until || i.snoozed_until <= now())
    )
  },

  markReminderFired(id: string): void {
    itemsDB.update(id, { reminder_fired: 1 })
  },

  snooze(id: string, minutes: number): void {
    const until = new Date(Date.now() + minutes * 60_000).toISOString()
    itemsDB.update(id, { snoozed_until: until, reminder_fired: 0 })
  },

  rescheduleToNext(id: string): void {
    const it = itemsDB.getById(id); if (!it) return
    const base = it.reminder_at ? new Date(it.reminder_at) : new Date()
    const next = new Date(base)
    next.setDate(next.getDate() + 1) // suggest same time tomorrow
    itemsDB.update(id, { reminder_at: next.toISOString(), scheduled_at: next.toISOString(), reminder_fired: 0, snoozed_until: null })
  },

  dismissReminder(id: string): void {
    itemsDB.update(id, { reminder_at: null, reminder_fired: 0, snoozed_until: null })
  },
}

// ── shelves ───────────────────────────────────────────────────────────────────
export const shelvesDB = {
  getAll(): Shelf[] { return S.shelves },
  getRoots(): Shelf[] { return S.shelves.filter(s => !s.parent_id).sort((a,b) => a.sort_order - b.sort_order) },
  getChildren(parentId: string): Shelf[] { return S.shelves.filter(s => s.parent_id === parentId).sort((a,b) => a.sort_order - b.sort_order) },
  getById(id: string): Shelf | null { return S.shelves.find(s => s.id === id) ?? null },

  getPath(id: string): Shelf[] {
    const path: Shelf[] = []; let cur = shelvesDB.getById(id)
    while (cur) { path.unshift(cur); cur = cur.parent_id ? shelvesDB.getById(cur.parent_id) : null }
    return path
  },

  create(name: string, icon = '📁', parentId: string | null = null): Shelf {
    const maxOrder = S.shelves.filter(s => s.parent_id === parentId).reduce((m, s) => Math.max(m, s.sort_order), -1)
    const sh: Shelf = {
      id: uid(), name: name.trim(), icon, parent_id: parentId, sort_order: maxOrder + 1, created_at: now(),
      reminder_enabled: 0, reminder_time: null, reminder_days: '[]',
      notify_style: 'push', color: 'accent', priority: 'medium',
      total_duration_min: null, last_triggered_date: null,
    }
    S.shelves.push(sh); save(); return sh
  },

  update(id: string, updates: Partial<Shelf>): void {
    const idx = S.shelves.findIndex(s => s.id === id)
    if (idx !== -1) { S.shelves[idx] = { ...S.shelves[idx], ...updates }; save() }
  },

  delete(id: string): void {
    const collect = (sid: string): string[] => [sid, ...shelvesDB.getChildren(sid).flatMap(c => collect(c.id))]
    const rm = new Set(collect(id))
    S.shelves = S.shelves.filter(s => !rm.has(s.id))
    S.item_shelves = S.item_shelves.filter(r => !rm.has(r.shelf_id))
    save()
  },

  activeCount(id: string): number {
    const ids = new Set(S.item_shelves.filter(r => r.shelf_id === id).map(r => r.item_id))
    return S.items.filter(i => ids.has(i.id) && !i.done).length
  },

  isDescendant(checkId: string, ofId: string): boolean {
    if (checkId === ofId) return true
    return shelvesDB.getChildren(ofId).some(c => shelvesDB.isDescendant(checkId, c.id))
  },

  // ── shelf-level reminder engine ─────────────────────────────────────────────
  getDueForTrigger(): Shelf[] {
    const d = new Date()
    const hhmm = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    const today = d.toISOString().slice(0, 10)
    const dow = d.getDay()
    return S.shelves.filter(s => {
      if (!s.reminder_enabled || !s.reminder_time) return false
      if (s.reminder_time !== hhmm) return false
      if (s.last_triggered_date === today) return false
      let days: number[] = []
      try { days = JSON.parse(s.reminder_days || '[]') } catch {}
      if (days.length > 0 && !days.includes(dow)) return false
      return shelvesDB.activeCount(s.id) > 0
    })
  },

  markTriggered(id: string): void {
    shelvesDB.update(id, { last_triggered_date: new Date().toISOString().slice(0, 10) })
  },
}

// ── steps ─────────────────────────────────────────────────────────────────────
export const stepsDB = {
  getForItem(itemId: string): Step[] {
    return S.steps.filter(s => s.item_id === itemId).sort((a,b) => a.sort_order - b.sort_order)
  },

  create(itemId: string, content: string): Step {
    const maxOrder = S.steps.filter(s => s.item_id === itemId).reduce((m,s) => Math.max(m,s.sort_order), -1)
    const ts = parseTime(content)
    const step: Step = {
      id: uid(), item_id: itemId, content: content.trim(), done: 0, notes: '',
      reminder_at: ts ? ts.toISOString() : null,
      scheduled_at: ts ? ts.toISOString() : null,
      sort_order: maxOrder + 1, created_at: now(),
    }
    S.steps.push(step); save(); return step
  },

  toggle(id: string): void {
    const idx = S.steps.findIndex(s => s.id === id)
    if (idx !== -1) { S.steps[idx].done = S.steps[idx].done ? 0 : 1; save() }
  },

  update(id: string, updates: Partial<Step>): void {
    const idx = S.steps.findIndex(s => s.id === id)
    if (idx !== -1) { S.steps[idx] = { ...S.steps[idx], ...updates }; save() }
  },

  delete(id: string): void { S.steps = S.steps.filter(s => s.id !== id); save() },
}

// ── notes ─────────────────────────────────────────────────────────────────────
export const notesDB = {
  getAll(): Note[] { return S.notes.sort((a,b) => b.updated_at.localeCompare(a.updated_at)) },
  getById(id: string): Note | null { return S.notes.find(n => n.id === id) ?? null },

  create(shelfId: string | null = null): Note {
    const n: Note = { id: uid(), title: '', body: '', shelf_id: shelfId, created_at: now(), updated_at: now() }
    S.notes.unshift(n); save(); return n
  },

  update(id: string, updates: Partial<Note>): void {
    const idx = S.notes.findIndex(n => n.id === id)
    if (idx !== -1) { S.notes[idx] = { ...S.notes[idx], ...updates, updated_at: now() }; save() }
  },

  delete(id: string): void { S.notes = S.notes.filter(n => n.id !== id); save() },
}

// ── focus sessions ────────────────────────────────────────────────────────────
export const sessionsDB = {
  getAll(): FocusSession[] { return S.focus_sessions },

  getForItem(itemId: string): FocusSession[] {
    return S.focus_sessions.filter(s => s.item_id === itemId)
  },

  start(itemId: string | null): FocusSession {
    const s: FocusSession = { id: uid(), item_id: itemId, started_at: now(), ended_at: null, duration_seconds: null, completed: 0 }
    S.focus_sessions.push(s); save(); return s
  },
  end(id: string, completed = false): void {
    const idx = S.focus_sessions.findIndex(s => s.id === id)
    if (idx !== -1) {
      const started = new Date(S.focus_sessions[idx].started_at).getTime()
      S.focus_sessions[idx] = { ...S.focus_sessions[idx], ended_at: now(), duration_seconds: Math.round((Date.now()-started)/1000), completed: completed ? 1 : 0 }
      save()
    }
  },
}

// ── prefs ─────────────────────────────────────────────────────────────────────
export const prefsDB = {
  get(key: string, def = ''): string { return S.prefs[key] ?? def },
  set(key: string, value: string):  void { S.prefs[key] = value; save() },
}

// ── seed demo data ────────────────────────────────────────────────────────────
export function seedIfEmpty() {
  if (S.items.length > 0 || S.shelves.length > 0) return

  const mr  = shelvesDB.create('Morning Routine', '🌅')
  const ideas = shelvesDB.create('Ideas', '💡')
  const product = shelvesDB.create('Product Ideas', '📦', ideas.id)
  const desk  = shelvesDB.create('Desk Work', '🖥️')
  const shopping = shelvesDB.create('Shopping', '🛒')

  const wake = itemsDB.create('Wake up at 4:30am', 'REMINDER', [mr.id])
  itemsDB.update(wake.id, { repeat_rule: 'daily', duration_min: 0 })

  const pray = itemsDB.create('Pray and journal', 'TASK', [mr.id])
  stepsDB.create(pray.id, 'Read a Psalm')
  stepsDB.create(pray.id, 'Pray for family')

  itemsDB.create('Cold shower and dress', 'TASK', [mr.id])
  itemsDB.create('Review day plan in Flow', 'TASK', [mr.id])

  const mesa = itemsDB.create('Flow physical notebook — A5 built around Flow method', 'IDEA', [product.id, ideas.id])
  stepsDB.create(mesa.id, 'Research binding options')
  stepsDB.create(mesa.id, 'Design cover')

  itemsDB.create('Ugali Wraps street food concept', 'IDEA', [product.id])
  itemsDB.create('Write content script for next video', 'TASK', [desk.id])
  itemsDB.create('Buy timber for table project', 'TASK', [shopping.id])
  itemsDB.create('Buy screws and sandpaper', 'TASK', [shopping.id])

  notesDB.create(null)
  const n = S.notes[0]
  notesDB.update(n.id, { title: 'Why I started Flow', body: 'I kept losing ideas in WhatsApp messages to myself.\n\nFlow is the OS for the space between thoughts and action.\n\nCapture first. Organize later. Act with clarity.' })

  save()
}
