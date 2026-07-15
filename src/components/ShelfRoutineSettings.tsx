import { useState } from 'react'
import type { Shelf, NotifyStyle, ShelfColor, Priority } from '../db/client'
import { useFlowStore } from '../store/useFlowStore'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const NOTIFY_STYLES: NotifyStyle[] = ['push', 'sound', 'vibration', 'silent']
const COLORS: { key: ShelfColor; hex: string }[] = [
  { key: 'accent', hex: '#c8f59a' },
  { key: 'blue',   hex: '#6b9bf7' },
  { key: 'purple', hex: '#a594f7' },
  { key: 'gold',   hex: '#ecc873' },
  { key: 'red',    hex: '#e8654a' },
]
const PRIORITIES: Priority[] = ['low', 'medium', 'high']

function parseDays(json: string): number[] {
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : [] } catch { return [] }
}

export default function ShelfRoutineSettings({ shelf }: { shelf: Shelf }) {
  const { updateShelf } = useFlowStore()
  const [open, setOpen] = useState(false)
  const days = parseDays(shelf.reminder_days)

  function toggleDay(d: number) {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort()
    updateShelf(shelf.id, { reminder_days: JSON.stringify(next) })
  }

  return (
    <div className="mb-5 bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-bg-3 transition-colors"
      >
        <span className="text-xs text-ink-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: COLORS.find(c => c.key === shelf.color)?.hex }} />
          Routine settings
          {shelf.reminder_enabled === 1 && shelf.reminder_time && (
            <span className="text-[9px] text-ink-3 font-mono">· {shelf.reminder_time}</span>
          )}
        </span>
        <span className="text-[9px] text-ink-3">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[rgba(242,239,234,.06)]">

          {/* Reminder toggle + time */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="section-label mb-0">Reminder</p>
              <button
                onClick={() => updateShelf(shelf.id, { reminder_enabled: shelf.reminder_enabled ? 0 : 1 })}
                className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all
                  ${shelf.reminder_enabled
                    ? 'border-[rgba(200,245,154,.4)] text-[#c8f59a] bg-[rgba(200,245,154,.08)]'
                    : 'border-[rgba(242,239,234,.08)] text-ink-3'}`}
              >{shelf.reminder_enabled ? 'On' : 'Off'}</button>
            </div>
            {shelf.reminder_enabled === 1 && (
              <div className="space-y-2">
                <input
                  type="time"
                  value={shelf.reminder_time ?? ''}
                  onChange={e => updateShelf(shelf.id, { reminder_time: e.target.value || null })}
                  className="input-base text-xs"
                  style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                />
                <div className="flex gap-1">
                  {DAYS.map((d, i) => (
                    <button key={d} onClick={() => toggleDay(i)}
                      className={`w-8 h-7 rounded text-[9px] font-mono transition-all
                        ${days.includes(i) || days.length === 0
                          ? 'bg-[rgba(200,245,154,.1)] text-[#c8f59a] border border-[rgba(200,245,154,.3)]'
                          : 'bg-bg-4 text-ink-3 border border-transparent'}`}
                    >{d[0]}</button>
                  ))}
                </div>
                <p className="text-[9px] text-ink-3">{days.length === 0 ? 'Every day' : `${days.length} day(s) selected`}</p>
              </div>
            )}
          </div>

          {/* Notify style */}
          <div>
            <p className="section-label">Notification style</p>
            <div className="flex flex-wrap gap-1.5">
              {NOTIFY_STYLES.map(s => (
                <button key={s} onClick={() => updateShelf(shelf.id, { notify_style: s })}
                  className={`text-[8px] tracking-widest uppercase font-mono px-2 py-0.5 rounded border transition-all
                    ${shelf.notify_style === s
                      ? 'border-[rgba(200,245,154,.4)] text-[#c8f59a] bg-[rgba(200,245,154,.08)]'
                      : 'border-[rgba(242,239,234,.08)] text-ink-3 hover:text-ink-2'}`}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Color + priority */}
          <div className="flex gap-6">
            <div>
              <p className="section-label">Color</p>
              <div className="flex gap-1.5">
                {COLORS.map(c => (
                  <button key={c.key} onClick={() => updateShelf(shelf.id, { color: c.key })}
                    className="w-5 h-5 rounded-full transition-all"
                    style={{ background: c.hex, outline: shelf.color === c.key ? `2px solid ${c.hex}` : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="section-label">Priority</p>
              <div className="flex gap-1">
                {PRIORITIES.map(p => (
                  <button key={p} onClick={() => updateShelf(shelf.id, { priority: p })}
                    className={`text-[8px] tracking-widest uppercase font-mono px-2 py-0.5 rounded border transition-all
                      ${shelf.priority === p
                        ? 'border-[rgba(200,245,154,.4)] text-[#c8f59a] bg-[rgba(200,245,154,.08)]'
                        : 'border-[rgba(242,239,234,.08)] text-ink-3 hover:text-ink-2'}`}
                  >{p}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Total duration */}
          <div>
            <p className="section-label">Total duration (minutes)</p>
            <input
              type="number" min={0}
              value={shelf.total_duration_min ?? ''}
              onChange={e => updateShelf(shelf.id, { total_duration_min: e.target.value ? +e.target.value : null })}
              placeholder="e.g. 90"
              className="input-base text-xs w-24"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
