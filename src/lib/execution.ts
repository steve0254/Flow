import type { Item, DurationUnit } from '../db/client'

// ── unit conversion ──────────────────────────────────────────────────────────
export const UNIT_MS: Record<DurationUnit, number> = {
  minutes: 60_000,
  hours:   3_600_000,
  days:    86_400_000,
  weeks:   604_800_000,
  months:  2_629_800_000, // ~30.44 days, calendar-average
}

export const UNIT_LABEL: Record<DurationUnit, string> = {
  minutes: 'min', hours: 'hr', days: 'day', weeks: 'wk', months: 'mo',
}

export const DURATION_UNITS: DurationUnit[] = ['minutes', 'hours', 'days', 'weeks', 'months']

export function durationMs(value: number, unit: DurationUnit): number {
  return value * UNIT_MS[unit]
}

// ── execution state ──────────────────────────────────────────────────────────
export interface ExecutionState {
  totalMs:     number
  elapsedMs:   number
  remainingMs: number
  pct:         number       // 0-100, uncapped input clamped to 100
  eta:         Date
  isOverdue:   boolean
}

/** Returns null if the item has no duration set or hasn't been started. */
export function getExecutionState(item: Item, nowMs = Date.now()): ExecutionState | null {
  if (!item.duration_value || !item.duration_unit || !item.started_at) return null
  const totalMs   = durationMs(item.duration_value, item.duration_unit)
  const startedMs = new Date(item.started_at).getTime()
  const elapsedMs = Math.max(0, nowMs - startedMs)
  const remainingMs = Math.max(0, totalMs - elapsedMs)
  const pct = totalMs > 0 ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : 0
  const eta = new Date(startedMs + totalMs)
  return { totalMs, elapsedMs, remainingMs, pct, eta, isOverdue: elapsedMs > totalMs }
}

// ── formatting ────────────────────────────────────────────────────────────────
export function fmtDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  if (totalMin < 1) return '<1 min'
  if (totalMin < 60) return `${totalMin} min`
  const totalHours = Math.floor(totalMin / 60)
  const remMin = totalMin % 60
  if (totalHours < 24) return remMin ? `${totalHours}h ${remMin}m` : `${totalHours}h`
  const totalDays = Math.floor(totalHours / 24)
  const remHours = totalHours % 24
  if (totalDays < 7) return remHours ? `${totalDays}d ${remHours}h` : `${totalDays}d`
  const totalWeeks = Math.floor(totalDays / 7)
  const remDays = totalDays % 7
  return remDays ? `${totalWeeks}w ${remDays}d` : `${totalWeeks}w`
}

export function fmtETA(date: Date): string {
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `Today ${time}`
  if (isTomorrow) return `Tomorrow ${time}`
  const withinWeek = date.getTime() - now.getTime() < 7 * 86_400_000
  if (withinWeek) return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + time
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + time
}

// ── milestones ────────────────────────────────────────────────────────────────
export function parseMilestones(json: string): number[] {
  try { const v = JSON.parse(json); return Array.isArray(v) ? v.filter(n => typeof n === 'number') : [] }
  catch { return [] }
}

/** Milestones that are now crossed but not yet recorded as fired. Includes a virtual 100 for completion time-up. */
export function getCrossedMilestones(item: Item, pct: number): number[] {
  const enabled = parseMilestones(item.milestone_pcts)
  const fired   = new Set(parseMilestones(item.milestones_fired))
  const all = [...enabled, 100].filter((v, i, arr) => arr.indexOf(v) === i)
  return all.filter(m => pct >= m && !fired.has(m)).sort((a, b) => a - b)
}

export function milestoneMessage(item: Item, pct: number): string {
  if (pct >= 100) return `Time's up — "${item.content}" was scheduled to finish now.`
  return `${item.content}: ${pct}% complete`
}

/** True once remaining time crosses the item's "remind me with N min left" threshold. */
export function shouldRemindTimeLeft(item: Item, state: ExecutionState): boolean {
  if (!item.remind_before_min) return false
  const remMin = state.remainingMs / 60_000
  return remMin <= item.remind_before_min && state.pct < 100
}
