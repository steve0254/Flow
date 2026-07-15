import type { Item, Shelf, FocusSession } from '../db/client'

const DAY_MS = 86_400_000
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dayKey(iso: string): string { return new Date(iso).toDateString() }

// ── task-level analytics ─────────────────────────────────────────────────────
export interface TaskAnalytics {
  totalActive:        number
  totalDone:          number
  completionRate:     number   // 0-100
  avgCompletionMin:   number | null
  longestStreakDays:  number
  missedCount:        number
  mostProductiveHour: number | null   // 0-23
  mostProductiveDay:  string | null   // "Mon" etc
  doneLast7Days:      number
}

export function taskAnalytics(items: Item[], sessions: FocusSession[]): TaskAnalytics {
  const done = items.filter(i => i.done && i.done_at)
  const active = items.filter(i => !i.done)

  // avg completion time: prefer explicit started_at→done_at, else completed focus sessions
  const durations: number[] = []
  done.forEach(i => {
    if (i.started_at && i.done_at) {
      durations.push(new Date(i.done_at).getTime() - new Date(i.started_at).getTime())
    }
  })
  sessions.filter(s => s.completed && s.duration_seconds).forEach(s => durations.push(s.duration_seconds! * 1000))
  const avgCompletionMin = durations.length
    ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) / 60_000)
    : null

  // streak: consecutive days (including today or yesterday) with >=1 done item
  const doneDays = new Set(done.map(i => dayKey(i.done_at!)))
  let streak = 0
  let cursor = new Date()
  // allow the streak to still "count" if today has nothing done yet but yesterday does
  if (!doneDays.has(cursor.toDateString())) cursor = new Date(cursor.getTime() - DAY_MS)
  while (doneDays.has(cursor.toDateString())) {
    streak++
    cursor = new Date(cursor.getTime() - DAY_MS)
  }

  // missed: has a reminder in the past, still not done
  const nowIso = new Date().toISOString()
  const missedCount = items.filter(i => !i.done && i.reminder_at && i.reminder_at < nowIso).length

  // productivity histograms
  const hourCounts = new Array(24).fill(0)
  const dayCounts  = new Array(7).fill(0)
  done.forEach(i => {
    const d = new Date(i.done_at!)
    hourCounts[d.getHours()]++
    dayCounts[d.getDay()]++
  })
  const mostProductiveHour = hourCounts.some(c => c > 0) ? hourCounts.indexOf(Math.max(...hourCounts)) : null
  const mostProductiveDay  = dayCounts.some(c => c > 0) ? DAY_NAMES[dayCounts.indexOf(Math.max(...dayCounts))] : null

  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString()
  const doneLast7Days = done.filter(i => i.done_at! >= sevenDaysAgo).length

  const totalDone = done.length
  const totalActive = active.length
  const completionRate = (totalDone + totalActive) > 0
    ? Math.round((totalDone / (totalDone + totalActive)) * 100)
    : 0

  return {
    totalActive, totalDone, completionRate, avgCompletionMin,
    longestStreakDays: streak, missedCount, mostProductiveHour, mostProductiveDay, doneLast7Days,
  }
}

// ── shelf-level analytics ────────────────────────────────────────────────────
export interface ShelfAnalytics {
  shelfId:            string
  totalItems:         number
  doneItems:          number
  successRate:        number   // 0-100
  avgDurationMin:      number | null
  timeSavedMin:        number
  consistencyScore:   number   // 0-100, % of last 30 days with activity
}

export function shelfAnalytics(shelf: Shelf, shelfItems: Item[]): ShelfAnalytics {
  const done = shelfItems.filter(i => i.done)
  const totalItems = shelfItems.length
  const doneItems = done.length
  const successRate = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  const withDuration = shelfItems.filter(i => i.duration_value && i.duration_unit)
  const avgDurationMin = shelf.total_duration_min
    ?? (withDuration.length
        ? Math.round(withDuration.reduce((sum, i) => {
            const unitMin: Record<string, number> = { minutes: 1, hours: 60, days: 1440, weeks: 10080, months: 43830 }
            return sum + i.duration_value! * (unitMin[i.duration_unit!] ?? 1)
          }, 0) / withDuration.length)
        : null)

  let timeSavedMin = 0
  done.forEach(i => {
    if (i.duration_value && i.duration_unit && i.started_at && i.done_at) {
      const unitMin: Record<string, number> = { minutes: 1, hours: 60, days: 1440, weeks: 10080, months: 43830 }
      const plannedMin = i.duration_value * (unitMin[i.duration_unit] ?? 1)
      const actualMin = (new Date(i.done_at).getTime() - new Date(i.started_at).getTime()) / 60_000
      if (actualMin < plannedMin) timeSavedMin += plannedMin - actualMin
    }
  })

  const thirtyDaysAgo = Date.now() - 30 * DAY_MS
  const activeDays = new Set(
    done.filter(i => i.done_at && new Date(i.done_at).getTime() >= thirtyDaysAgo)
        .map(i => dayKey(i.done_at!))
  )
  const consistencyScore = Math.round((activeDays.size / 30) * 100)

  return {
    shelfId: shelf.id, totalItems, doneItems, successRate,
    avgDurationMin, timeSavedMin: Math.round(timeSavedMin), consistencyScore,
  }
}
