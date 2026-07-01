import { create } from 'zustand'
import { itemsDB, shelvesDB, stepsDB, notesDB, sessionsDB, prefsDB, reloadStore, seedIfEmpty, classify } from '../db/client'
import type { Item, Shelf, Step, Note, ItemType } from '../db/client'

export type Screen = 'home' | 'inbox' | 'shelves' | 'focus' | 'notes'

interface Timer {
  running:    boolean
  elapsed:    number
  duration:   number   // seconds, default 25*60
  sessionId:  string | null
  intervalId: ReturnType<typeof setInterval> | null
}

interface FlowStore {
  // nav
  screen:        Screen
  setScreen:     (s: Screen) => void
  currentShelf:  string | null
  openShelf:     (id: string) => void
  detailItemId:  string | null
  openDetail:    (id: string) => void
  closeDetail:   () => void

  // data
  items:        Item[]
  shelves:      Shelf[]
  focus:        Item | null
  queue:        Item[]

  load:         () => void
  createItem:   (content: string, type?: ItemType, shelfIds?: string[]) => Item
  createMany:   (lines: string[], shelfIds?: string[]) => Item[]
  updateItem:   (id: string, updates: Partial<Item>) => void
  markDone:     (id: string) => void
  deleteItem:   (id: string) => void
  setFocus:     (id: string | null) => void
  addToShelf:   (itemId: string, shelfId: string) => void
  removeFromShelf: (itemId: string, shelfId: string) => void
  promoteToProject: (id: string) => void

  // steps
  steps:        Record<string, Step[]>
  loadSteps:    (itemId: string) => void
  addStep:      (itemId: string, content: string) => void
  toggleStep:   (stepId: string, itemId: string) => void
  deleteStep:   (stepId: string, itemId: string) => void
  updateStep:   (stepId: string, itemId: string, updates: Partial<Step>) => void

  // notes
  notes:        Note[]
  currentNote:  string | null
  loadNotes:    () => void
  newNote:      (shelfId?: string) => void
  updateNote:   (id: string, updates: Partial<Note>) => void
  deleteNote:   (id: string) => void
  setCurrentNote: (id: string | null) => void

  // timer
  timer:        Timer
  startTimer:   () => void
  pauseTimer:   () => void
  stopTimer:    () => void

  // focus shelf sequence
  focusShelfId: string | null
  focusShelfQueue: Item[]
  startShelfFocus: (shelfId: string) => void
  advanceShelfFocus: () => void

  // resurface
  surfaced:     Item | null
  checkResurface: () => void
  dismissSurface: (id: string, keep: boolean) => void

  // search
  searchQuery:  string
  setSearch:    (q: string) => void

  // undo
  lastDeleted:  Item | null
  undoDelete:   () => void

  // shelf filter (shelves screen)
  shelfFilter:  'all' | 'active' | 'done'
  setShelfFilter: (f: 'all' | 'active' | 'done') => void
}

const DEFAULT_DURATION = 25 * 60

export const useFlowStore = create<FlowStore>((set, get) => ({
  // ── nav ──────────────────────────────────────────────────────────────────
  screen: 'home',
  setScreen: s => set({ screen: s }),
  currentShelf: null,
  openShelf: id => set({ currentShelf: id, screen: 'shelves' }),
  detailItemId: null,
  openDetail: id => set({ detailItemId: id }),
  closeDetail: () => set({ detailItemId: null }),

  // ── data ─────────────────────────────────────────────────────────────────
  items: [], shelves: [], focus: null, queue: [],

  load() {
    reloadStore()
    seedIfEmpty()
    set({
      items:   itemsDB.getActive(),
      shelves: shelvesDB.getAll(),
      focus:   itemsDB.getFocus(),
      queue:   itemsDB.getQueue(6),
      notes:   notesDB.getAll(),
    })
  },

  createItem(content, type, shelfIds = []) {
    const item = itemsDB.create(content, type, shelfIds)
    get().load(); return item
  },

  createMany(lines, shelfIds = []) {
    const items = itemsDB.createMany(lines, shelfIds)
    get().load(); return items
  },

  updateItem(id, updates) { itemsDB.update(id, updates); get().load() },

  markDone(id) {
    const { timer, focus, focusShelfId } = get()
    if (focus?.id === id && timer.running) get().stopTimer()
    itemsDB.markDone(id)
    if (focusShelfId) get().advanceShelfFocus()
    get().load()
    const f = (window as any).flow
    if (f?.notify) f.notify('Flow', 'Done ✓')
  },

  deleteItem(id) {
    const item = itemsDB.getById(id)
    itemsDB.delete(id)
    set({ lastDeleted: item, detailItemId: null })
    get().load()
  },

  setFocus(id) {
    const { timer } = get()
    if (timer.running) get().stopTimer()
    itemsDB.setFocus(id)
    set({ focusShelfId: null, focusShelfQueue: [] })
    get().load()
  },

  addToShelf(itemId, shelfId) { itemsDB.addToShelf(itemId, shelfId); get().load() },
  removeFromShelf(itemId, shelfId) { itemsDB.removeFromShelf(itemId, shelfId); get().load() },

  promoteToProject(id) {
    const sh = itemsDB.promoteToProject(id)
    if (sh) { get().load(); set({ currentShelf: sh.id, screen: 'shelves' }) }
  },

  // ── steps ─────────────────────────────────────────────────────────────────
  steps: {},

  loadSteps(itemId) {
    set(s => ({ steps: { ...s.steps, [itemId]: stepsDB.getForItem(itemId) } }))
  },

  addStep(itemId, content) {
    stepsDB.create(itemId, content); get().loadSteps(itemId)
  },

  toggleStep(stepId, itemId) {
    stepsDB.toggle(stepId); get().loadSteps(itemId)
  },

  deleteStep(stepId, itemId) {
    stepsDB.delete(stepId); get().loadSteps(itemId)
  },

  updateStep(stepId, itemId, updates) {
    stepsDB.update(stepId, updates); get().loadSteps(itemId)
  },

  // ── notes ─────────────────────────────────────────────────────────────────
  notes: [], currentNote: null,

  loadNotes() { set({ notes: notesDB.getAll() }) },

  newNote(shelfId) {
    const n = notesDB.create(shelfId ?? null)
    get().loadNotes(); set({ currentNote: n.id })
  },

  updateNote(id, updates) { notesDB.update(id, updates); get().loadNotes() },
  deleteNote(id) { notesDB.delete(id); set({ currentNote: null }); get().loadNotes() },
  setCurrentNote(id) { set({ currentNote: id }) },

  // ── timer ─────────────────────────────────────────────────────────────────
  timer: { running: false, elapsed: 0, duration: DEFAULT_DURATION, sessionId: null, intervalId: null },

  startTimer() {
    const { timer, focus } = get()
    if (timer.running) return
    const session = sessionsDB.start(focus?.id ?? null)
    const intervalId = setInterval(() => {
      const { timer } = get()
      const elapsed = timer.elapsed + 1
      if (elapsed >= timer.duration) {
        clearInterval(intervalId)
        sessionsDB.end(session.id, true)
        set(s => ({ timer: { ...s.timer, running: false, elapsed: s.timer.duration, intervalId: null } }))
        const f = (window as any).flow
        if (f?.notify) f.notify('Flow', 'Focus session complete. Take a break.')
      } else {
        set(s => ({ timer: { ...s.timer, elapsed } }))
      }
    }, 1000)
    set(s => ({ timer: { ...s.timer, running: true, sessionId: session.id, intervalId } }))
  },

  pauseTimer() {
    const { timer } = get()
    if (timer.intervalId) clearInterval(timer.intervalId)
    set(s => ({ timer: { ...s.timer, running: false, intervalId: null } }))
  },

  stopTimer() {
    const { timer } = get()
    if (timer.intervalId) clearInterval(timer.intervalId)
    if (timer.sessionId) sessionsDB.end(timer.sessionId, false)
    set(s => ({ timer: { ...s.timer, running: false, elapsed: 0, sessionId: null, intervalId: null } }))
  },

  // ── shelf sequence ─────────────────────────────────────────────────────────
  focusShelfId: null, focusShelfQueue: [],

  startShelfFocus(shelfId) {
    const all = itemsDB.getForShelf(shelfId).filter(i => !i.done)
    if (!all.length) return
    itemsDB.setFocus(all[0].id)
    set({ focusShelfId: shelfId, focusShelfQueue: all, screen: 'focus' })
    get().load()
  },

  advanceShelfFocus() {
    const { focusShelfId } = get()
    if (!focusShelfId) return
    const next = itemsDB.getForShelf(focusShelfId).filter(i => !i.done)
    if (next.length) {
      itemsDB.setFocus(next[0].id)
      set({ focusShelfQueue: next })
    } else {
      itemsDB.setFocus(null)
      set({ focusShelfId: null, focusShelfQueue: [] })
    }
    get().load()
  },

  // ── resurface ─────────────────────────────────────────────────────────────
  surfaced: null,

  checkResurface() {
    const old = itemsDB.getNeglected(3)
    set({ surfaced: old.length ? old[Math.floor(Math.random() * old.length)] : null })
  },

  dismissSurface(id, keep) {
    if (keep) itemsDB.update(id, { sort_order: 0 })
    itemsDB.markSurfaced(id)
    set({ surfaced: null })
    get().load()
  },

  // ── search ─────────────────────────────────────────────────────────────────
  searchQuery: '',
  setSearch(q) { set({ searchQuery: q }) },

  // ── undo ──────────────────────────────────────────────────────────────────
  lastDeleted: null,
  undoDelete() {
    const { lastDeleted } = get()
    if (!lastDeleted) return
    // Re-insert: create fresh with same content
    get().createItem(lastDeleted.content, lastDeleted.type as ItemType)
    set({ lastDeleted: null })
  },

  // ── shelf display filter ──────────────────────────────────────────────────
  shelfFilter: 'all',
  setShelfFilter: f => set({ shelfFilter: f }),
}))
