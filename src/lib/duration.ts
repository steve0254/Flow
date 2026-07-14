import type { DurationUnit, Item } from '../db/client'

export const UNIT_MS: Record<DurationUnit, number> = {
  minutes: 60_000,
  hours:   3_600_000,
  days:    86_400_000,
  weeks:   604_800_000,
  months:  2_629_800_000, // average month (30.44 days) — good enough for planning-scale durations
}

export const UNIT_LABEL: Record<DurationUnit, string> = {
  minutes: 'Minutes', hours: 'Hours', days: 'Days', weeks: 'Weeks', months: 'Months',
}

export const DURATION_UNITS: DurationUnit[] = ['minutes', 'hours', 'days', 'weeks', 'months']

export function durationMs(value: number, unit: DurationUnit): number {
  return value * UNIT_MS[unit]
}

export interface DurationProgress {
  hasDuration: boolean
  isRunning:   boolean
  isStarted:   boolean          // has ever been started (accumulated > 0 or running)
  totalMs:     number
  elapsedMs:   number
  remainingMs: number
  percent:     number           // 0–100, clamped
  isComplete:  boolean
  eta:         Date | null      // estimated finish time
}

/** Pure function: given an item, compute where its duration clock currently stands. */
export function computeDurationProgress(item: Pick<Item,
  'duration_value' | 'duration_unit' | 'exec_started_at' | 'exec_accumulated_ms'
>, now = Date.now()): DurationProgress {
  const hasDuration = !!(item.duration_value && item.duration_unit)
  const totalMs = hasDuration ? durationMs(item.duration_value!, item.duration_unit!) : 0
  const isRunning = !!item.exec_started_at
  const runningMs = isRunning ? Math.max(0, now - new Date(item.exec_started_at!).getTime()) : 0
  const elapsedMs = Math.min(totalMs, (item.exec_accumulated_ms ?? 0) + runningMs)
  const remainingMs = Math.max(0, totalMs - elapsedMs)
  const percent = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 0
  const isStarted = isRunning || (item.exec_accumulated_ms ?? 0) > 0
  const isComplete = hasDuration && elapsedMs >= totalMs
  const eta = hasDuration && isStarted ? new Date(now + remainingMs) : null
  return { hasDuration, isRunning, isStarted, totalMs, elapsedMs, remainingMs, percent, isComplete, eta }
}

/** Compact human-readable duration, e.g. "45m", "1h 12m", "3d 4h", "2w", "3mo" */
export function fmtDurationMs(ms: number): string {
  if (ms <= 0) return '0m'
  const mins   = Math.floor(ms / 60_000)
  const hrs    = Math.floor(mins / 60)
  const days   = Math.floor(hrs / 24)
  const weeks  = Math.floor(days / 7)
  const months = Math.floor(days / 30.44)

  if (months >= 1) {
    const remDays = Math.round(days - months * 30.44)
    return remDays > 0 ? `${months}mo ${remDays}d` : `${months}mo`
  }
  if (weeks >= 1) {
    const remDays = days - weeks * 7
    return remDays > 0 ? `${weeks}w ${remDays}d` : `${weeks}w`
  }
  if (days >= 1) {
    const remHrs = hrs - days * 24
    return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`
  }
  if (hrs >= 1) {
    const remMins = mins - hrs * 60
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
  }
  const secs = Math.floor((ms % 60_000) / 1000)
  if (mins >= 1) return `${mins}m`
  return `${secs}s`
}

/** Friendly duration input label, e.g. "3 days", "45 minutes" */
export function fmtDurationValue(value: number, unit: DurationUnit): string {
  const label = unit === 'minutes' ? 'minute' : unit.slice(0, -1)
  return `${value} ${label}${value === 1 ? '' : 's'}`
}

export function fmtETA(date: Date, now = new Date()): string {
  const sameDay = date.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `Today, ${time}`
  if (isTomorrow) return `Tomorrow, ${time}`
  const withinWeek = date.getTime() - now.getTime() < 6 * 86_400_000
  if (withinWeek) return `${date.toLocaleDateString([], { weekday: 'long' })}, ${time}`
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

export function parseMilestones(json: string): number[] {
  try { const a = JSON.parse(json); return Array.isArray(a) ? a.filter(n => typeof n === 'number') : [] }
  catch { return [] }
}

export function stringifyMilestones(arr: number[]): string {
  return JSON.stringify([...new Set(arr)].sort((a, b) => a - b))
}
