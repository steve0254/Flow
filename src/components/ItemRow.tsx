import { useFlowStore } from '../store/useFlowStore'
import type { Item } from '../db/client'
import { ago, fmtTime, typeColor } from '../lib/utils'

interface Props {
  item: Item
  showShelfBadges?: boolean
  onFocus?: () => void
}

export default function ItemRow({ item, showShelfBadges, onFocus }: Props) {
  const { openDetail, setFocus, markDone, shelves } = useFlowStore()

  const shelfBadges = showShelfBadges
    ? shelves.filter(s => item.shelf_ids?.includes(s.id))
    : []

  return (
    <div
      className={`group flex items-start gap-2.5 py-2.5 px-2 rounded transition-colors cursor-pointer hover:bg-bg-3
        ${item.done ? 'opacity-40' : ''}`}
      onClick={() => openDetail(item.id)}
    >
      {/* Done circle */}
      <button
        onClick={e => { e.stopPropagation(); if (!item.done) markDone(item.id) }}
        className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex-shrink-0 transition-all
          ${item.done
            ? 'bg-[rgba(200,245,154,.3)] border-[#c8f59a]'
            : 'border-ink-3 hover:border-[#c8f59a] hover:bg-[rgba(200,245,154,.1)]'
          }`}
        title="Mark done"
      />

      <div className="flex-1 min-w-0">
        {/* Content */}
        <p className={`text-sm leading-snug ${item.done ? 'line-through text-ink-3' : 'text-ink-1'}`}>
          {item.content}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`pill pill-${item.type}`}>{item.type}</span>

          {item.reminder_at && !item.done && (
            <span className="text-[9px] text-[#e8654a] font-mono">{fmtTime(item.reminder_at)}</span>
          )}

          {item.progress_total && (
            <span className="text-[9px] text-ink-3 font-mono">
              {item.progress_current ?? 0}/{item.progress_total} {item.progress_unit ?? ''}
            </span>
          )}

          {item.repeat_rule && (
            <span className="text-[9px] text-ink-3 font-mono">↻ {item.repeat_rule}</span>
          )}

          <span className="text-[9px] text-ink-3">{ago(item.created_at)}</span>

          {shelfBadges.map(s => (
            <span key={s.id} className="text-[9px] text-ink-3 bg-bg-4 px-1.5 py-0.5 rounded">
              {s.icon} {s.name}
            </span>
          ))}
        </div>

        {/* Steps progress bar */}
        {item.steps && item.steps.length > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-px bg-bg-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c8f59a] transition-all"
                style={{ width: `${(item.steps.filter(s => s.done).length / item.steps.length) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-ink-3 font-mono">
              {item.steps.filter(s => s.done).length}/{item.steps.length}
            </span>
          </div>
        )}
      </div>

      {/* Focus button */}
      {!item.done && (
        <button
          onClick={e => { e.stopPropagation(); setFocus(item.id); onFocus?.() }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] px-2 py-1 rounded
                     border border-[rgba(242,239,234,.1)] text-ink-3 hover:text-[#c8f59a] hover:border-[rgba(200,245,154,.3)]"
          title="Set as focus"
        >
          Focus
        </button>
      )}
    </div>
  )
}
