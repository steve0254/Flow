import { useFlowStore } from '../store/useFlowStore'
import { sessionsDB } from '../db/client'
import { taskAnalytics, shelfAnalytics } from '../lib/analytics'

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${period}`
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-lg p-4 text-center">
      <p className="font-serif text-2xl text-ink-1">{value}</p>
      <p className="text-[9px] text-ink-3 mt-0.5 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[9px] text-ink-4 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function AnalyticsView() {
  const { items, shelves } = useFlowStore()
  const sessions = sessionsDB.getAll()
  const t = taskAnalytics(items, sessions)

  const shelfStats = shelves
    .map(s => ({ shelf: s, stats: shelfAnalytics(s, items.filter(i => i.shelf_ids?.includes(s.id))) }))
    .filter(({ stats }) => stats.totalItems > 0)
    .sort((a, b) => b.stats.totalItems - a.stats.totalItems)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="font-serif text-2xl text-ink-1 mb-1">Analytics</h1>
        <p className="text-ink-3 text-sm mb-8">How your execution is trending.</p>

        {/* Task analytics */}
        <p className="section-label mb-3">Tasks</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Completion rate" value={`${t.completionRate}%`} />
          <StatCard label="Active" value={t.totalActive} />
          <StatCard label="Done total" value={t.totalDone} />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard label="Avg time to done" value={t.avgCompletionMin !== null ? `${t.avgCompletionMin}m` : '—'} />
          <StatCard label="Longest streak" value={`${t.longestStreakDays}d`} />
          <StatCard label="Missed" value={t.missedCount} />
        </div>

        <div className="bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-xl p-4 mb-8">
          <p className="section-label mb-3">Productivity pattern</p>
          <div className="flex items-center gap-6 text-sm text-ink-2">
            <div>
              <span className="text-ink-3 text-xs">Most productive hour</span>
              <p className="font-serif text-lg text-ink-1">{t.mostProductiveHour !== null ? fmtHour(t.mostProductiveHour) : '—'}</p>
            </div>
            <div>
              <span className="text-ink-3 text-xs">Most productive day</span>
              <p className="font-serif text-lg text-ink-1">{t.mostProductiveDay ?? '—'}</p>
            </div>
            <div>
              <span className="text-ink-3 text-xs">Done last 7 days</span>
              <p className="font-serif text-lg text-ink-1">{t.doneLast7Days}</p>
            </div>
          </div>
        </div>

        {/* Shelf analytics */}
        <p className="section-label mb-3">Shelves</p>
        {shelfStats.length === 0 ? (
          <p className="text-xs text-ink-3 italic">No shelf activity yet.</p>
        ) : (
          <div className="space-y-2">
            {shelfStats.map(({ shelf, stats }) => (
              <div key={shelf.id} className="bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-ink-1 flex items-center gap-2">
                    <span>{shelf.icon}</span>{shelf.name}
                  </span>
                  <span className="text-[9px] text-ink-3 font-mono">{stats.doneItems}/{stats.totalItems} done</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-sm text-ink-1 font-mono">{stats.successRate}%</p>
                    <p className="text-[8px] text-ink-3 uppercase tracking-widest mt-0.5">Success</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-1 font-mono">{stats.avgDurationMin ?? '—'}{stats.avgDurationMin ? 'm' : ''}</p>
                    <p className="text-[8px] text-ink-3 uppercase tracking-widest mt-0.5">Avg duration</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-1 font-mono">{stats.timeSavedMin}m</p>
                    <p className="text-[8px] text-ink-3 uppercase tracking-widest mt-0.5">Time saved</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-1 font-mono">{stats.consistencyScore}%</p>
                    <p className="text-[8px] text-ink-3 uppercase tracking-widest mt-0.5">Consistency</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
