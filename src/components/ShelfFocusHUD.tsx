import type { Item, Shelf } from '../db/client'
import { useFlowStore } from '../store/useFlowStore'
import { UNIT_MS, fmtDuration, fmtETA } from '../lib/execution'

const COLOR_HEX: Record<string, string> = {
  accent: '#c8f59a', red: '#e8654a', blue: '#6b9bf7', gold: '#ecc873', purple: '#a594f7',
}

function unitToMin(value: number, unit: string): number {
  return (value * (UNIT_MS as any)[unit]) / 60_000
}

interface Props {
  shelf: Shelf
  queue: Item[]        // incomplete items still in the sequence
  totalCount: number    // total items originally in the shelf (done + remaining)
  startedAt: number | null
  paused: boolean
}

export default function ShelfFocusHUD({ shelf, queue, totalCount, startedAt, paused }: Props) {
  const { skipShelfFocus, pauseShelfFocus, resumeShelfFocus, reorderShelfQueue, exitShelfFocus } = useFlowStore()

  const remainingCount = queue.length
  const doneCount = Math.max(0, totalCount - remainingCount)
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const color = COLOR_HEX[shelf.color] ?? COLOR_HEX.accent

  // Estimate remaining time: shelf-level budget if set, else sum of item durations, else null
  let remainingMin: number | null = null
  if (shelf.total_duration_min && startedAt) {
    const elapsedMin = (Date.now() - startedAt) / 60_000
    remainingMin = Math.max(0, shelf.total_duration_min - elapsedMin)
  } else {
    const withDuration = queue.filter(i => i.duration_value && i.duration_unit)
    if (withDuration.length) {
      remainingMin = withDuration.reduce((sum, i) => sum + unitToMin(i.duration_value!, i.duration_unit!), 0)
    }
  }
  const eta = remainingMin !== null ? new Date(Date.now() + remainingMin * 60_000) : null

  function move(id: string, dir: -1 | 1) {
    const idx = queue.findIndex(i => i.id === id)
    const swap = idx + dir
    if (idx < 0 || swap < 0 || swap >= queue.length) return
    const next = [...queue]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    reorderShelfQueue(next.map(i => i.id))
  }

  return (
    <div className="w-full max-w-lg bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-xl p-4 mb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-sm font-medium text-ink-1">{shelf.icon} {shelf.name}</span>
        </div>
        <button onClick={exitShelfFocus} className="text-[9px] text-ink-3 hover:text-ink-2">Exit routine</button>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-1 text-[9px] text-ink-3 font-mono">
        <span>{doneCount}/{totalCount} done</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 bg-bg-4 rounded-full overflow-hidden mb-3">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>

      {/* Remaining time + ETA */}
      <div className="flex items-center gap-4 mb-3 text-[9px] text-ink-3 font-mono">
        <span>{remainingCount} task{remainingCount === 1 ? '' : 's'} remaining</span>
        {remainingMin !== null && <span>· {fmtDuration(remainingMin * 60_000)} left</span>}
        {eta && <span>· done by {fmtETA(eta)}</span>}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-3">
        {paused ? (
          <button onClick={resumeShelfFocus} className="btn btn-accent">▶ Resume</button>
        ) : (
          <button onClick={pauseShelfFocus} className="btn btn-ghost">⏸ Pause</button>
        )}
        <button onClick={skipShelfFocus} className="btn btn-ghost">Skip</button>
      </div>

      {/* Reorderable queue */}
      {queue.length > 1 && (
        <div className="border-t border-[rgba(242,239,234,.06)] pt-2 space-y-0.5">
          {queue.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2 py-1 group">
              <span className={`text-[9px] font-mono w-4 ${i === 0 ? 'text-[#c8f59a]' : 'text-ink-3'}`}>{i + 1}</span>
              <span className={`text-xs flex-1 truncate ${i === 0 ? 'text-ink-1' : 'text-ink-2'}`}>{item.content}</span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                <button onClick={() => move(item.id, -1)} disabled={i === 0} className="text-[9px] text-ink-3 hover:text-ink-1 disabled:opacity-20 px-1">▴</button>
                <button onClick={() => move(item.id, 1)} disabled={i === queue.length - 1} className="text-[9px] text-ink-3 hover:text-ink-1 disabled:opacity-20 px-1">▾</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
