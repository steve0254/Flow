import { useEffect, useState, useRef } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import { itemsDB, shelvesDB } from '../db/client'
import type { Item, Step } from '../db/client'
import { fmtTime, ICONS } from '../lib/utils'

const TYPES = ['TASK','IDEA','PROJECT','REMINDER','NOTE','JOURNAL'] as const
const STATUSES = ['raw','exploring','active','parked'] as const

export default function ItemDetail() {
  const { detailItemId, closeDetail, shelves, updateItem, deleteItem, markDone,
          loadSteps, addStep, toggleStep, deleteStep, steps, setFocus, promoteToProject, addToShelf, removeFromShelf } = useFlowStore()

  const [item, setItem] = useState<Item | null>(null)
  const [content, setContent]   = useState('')
  const [notes, setNotes]       = useState('')
  const [stepInput, setStepInput] = useState('')
  const [showAddShelf, setShowAddShelf] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!detailItemId) return
    const it = itemsDB.getById(detailItemId)
    if (!it) return
    const shelfIds = itemsDB.getShelfIds(detailItemId)
    setItem({ ...it, shelf_ids: shelfIds })
    setContent(it.content)
    setNotes(it.notes)
    loadSteps(detailItemId)
  }, [detailItemId])

  if (!detailItemId || !item) return null

  const itemSteps: Step[] = steps[item.id] ?? []
  const itemShelves = shelves.filter(s => item.shelf_ids?.includes(s.id))
  const otherShelves = shelves.filter(s => !item.shelf_ids?.includes(s.id))
  const progress = item.progress_total ? Math.round(((item.progress_current ?? 0) / item.progress_total) * 100) : null

  function save(field: string, value: any) {
    updateItem(item!.id, { [field]: value })
    setItem(i => i ? { ...i, [field]: value } : i)
  }

  function handleAddStep(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && stepInput.trim()) {
      addStep(item!.id, stepInput.trim())
      setStepInput('')
    }
  }

  function handleDelete() {
    if (confirm('Delete this item?')) deleteItem(item!.id)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-bg-1/60 backdrop-blur-sm animate-fadeIn"
      onClick={e => { if (e.target === e.currentTarget) closeDetail() }}
    >
      <div className="w-[480px] h-full bg-bg-2 border-l border-[rgba(242,239,234,.07)] flex flex-col animate-slideIn">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(242,239,234,.07)]">
          <div className="flex items-center gap-2">
            <span className={`pill pill-${item.type}`}>{item.type}</span>
            <span className="text-[9px] text-ink-3 font-mono uppercase px-2 py-0.5 rounded border border-[rgba(242,239,234,.08)]">
              {item.status}
            </span>
            {item.done === 1 && <span className="text-[9px] text-[#c8f59a]">✓ Done</span>}
          </div>
          <div className="flex items-center gap-2">
            {!item.done && (
              <>
                <button onClick={() => { setFocus(item.id); closeDetail() }} className="btn btn-ghost">Focus</button>
                <button onClick={() => markDone(item.id)} className="btn btn-accent">Done ✓</button>
              </>
            )}
            <button onClick={closeDetail} className="text-ink-3 hover:text-ink-1 text-lg leading-none px-1">×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Content */}
          <div>
            <p className="section-label">Content</p>
            <textarea
              ref={contentRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              onBlur={() => save('content', content)}
              className="w-full bg-transparent text-ink-1 text-base font-serif leading-relaxed resize-none outline-none border-b border-transparent focus:border-[rgba(242,239,234,.1)] pb-1 nodrag"
              rows={2}
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          </div>

          {/* Type + Status */}
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="section-label">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map(t => (
                  <button key={t}
                    onClick={() => save('type', t)}
                    className={`pill cursor-pointer transition-all ${item.type === t ? `pill-${t} opacity-100` : 'bg-bg-4 text-ink-3 hover:text-ink-2'}`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="section-label">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button key={s}
                    onClick={() => save('status', s)}
                    className={`text-[8px] tracking-widest uppercase font-mono px-2 py-0.5 rounded cursor-pointer border transition-all
                      ${item.status === s
                        ? 'border-[rgba(200,245,154,.4)] text-[#c8f59a] bg-[rgba(200,245,154,.08)]'
                        : 'border-[rgba(242,239,234,.08)] text-ink-3 hover:text-ink-2'
                      }`}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress (if set) */}
          {item.progress_total && (
            <div>
              <p className="section-label">Progress</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-bg-4 rounded-full overflow-hidden">
                  <div className="h-full bg-[#c8f59a] transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center gap-1 text-xs text-ink-2">
                  <input
                    type="number" value={item.progress_current ?? 0} min={0} max={item.progress_total}
                    onChange={e => save('progress_current', +e.target.value)}
                    className="w-12 bg-bg-4 rounded px-2 py-0.5 text-center outline-none text-xs nodrag"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  />
                  <span className="text-ink-3">/ {item.progress_total} {item.progress_unit}</span>
                </div>
              </div>
            </div>
          )}

          {/* Add progress tracking */}
          {!item.progress_total && (
            <button
              onClick={() => { save('progress_total', 100); save('progress_current', 0); save('progress_unit', '%') }}
              className="text-[9px] text-ink-3 hover:text-ink-2 underline underline-offset-2"
            >
              + Add progress tracking
            </button>
          )}

          {/* Reminder */}
          <div>
            <p className="section-label">Reminder</p>
            <input
              type="datetime-local"
              value={item.reminder_at ? item.reminder_at.slice(0, 16) : ''}
              onChange={e => save('reminder_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
              className="input-base text-xs w-full"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          </div>

          {/* Repeat */}
          <div>
            <p className="section-label">Repeat</p>
            <select
              value={item.repeat_rule ?? ''}
              onChange={e => save('repeat_rule', e.target.value || null)}
              className="input-base text-xs w-full nodrag"
            >
              <option value="">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Steps */}
          <div>
            <p className="section-label">Steps</p>
            <div className="space-y-1">
              {itemSteps.map(step => (
                <div key={step.id} className="group flex items-center gap-2 py-1.5">
                  <button
                    onClick={() => toggleStep(step.id, item.id)}
                    className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 transition-all
                      ${step.done ? 'bg-[rgba(200,245,154,.3)] border-[#c8f59a]' : 'border-ink-3 hover:border-[#c8f59a]'}`}
                  />
                  <span className={`text-sm flex-1 ${step.done ? 'line-through text-ink-3' : 'text-ink-1'}`}
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                    {step.content}
                  </span>
                  <button
                    onClick={() => deleteStep(step.id, item.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-[#e8654a] text-xs transition-all"
                  >✕</button>
                </div>
              ))}
            </div>
            <input
              type="text"
              value={stepInput}
              onChange={e => setStepInput(e.target.value)}
              onKeyDown={handleAddStep}
              placeholder="Add step… (Enter)"
              className="mt-2 w-full bg-transparent border-b border-[rgba(242,239,234,.1)] py-1 text-sm text-ink-1 placeholder-ink-3 outline-none focus:border-[rgba(200,245,154,.3)] transition-colors"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          </div>

          {/* Notes */}
          <div>
            <p className="section-label">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => save('notes', notes)}
              placeholder="Add notes…"
              rows={4}
              className="w-full bg-bg-3 rounded px-3 py-2 text-sm text-ink-1 placeholder-ink-3 outline-none resize-none border border-[rgba(242,239,234,.07)] focus:border-[rgba(200,245,154,.3)] transition-colors leading-relaxed"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          </div>

          {/* Shelves */}
          <div>
            <p className="section-label">In shelves</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {itemShelves.map(s => (
                <span key={s.id} className="flex items-center gap-1 text-xs bg-bg-4 px-2 py-1 rounded border border-[rgba(242,239,234,.08)]">
                  {s.icon} {s.name}
                  <button
                    onClick={() => { removeFromShelf(item.id, s.id); setItem(i => i ? { ...i, shelf_ids: i.shelf_ids?.filter(id => id !== s.id) } : i) }}
                    className="ml-1 text-ink-3 hover:text-[#e8654a]"
                  >×</button>
                </span>
              ))}
              {itemShelves.length === 0 && <span className="text-xs text-ink-3">Not in any shelf (Inbox)</span>}
            </div>

            {showAddShelf ? (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {otherShelves.map(s => (
                  <button key={s.id}
                    onClick={() => {
                      addToShelf(item.id, s.id)
                      setItem(i => i ? { ...i, shelf_ids: [...(i.shelf_ids ?? []), s.id] } : i)
                      setShowAddShelf(false)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-4 text-sm text-ink-2 hover:text-ink-1 text-left"
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => setShowAddShelf(true)} className="text-[9px] text-ink-3 hover:text-[#c8f59a] underline underline-offset-2">
                + Add to shelf
              </button>
            )}
          </div>

          {/* Promote to project */}
          {(item.type === 'IDEA' || item.type === 'TASK') && !item.done && (
            <button
              onClick={() => promoteToProject(item.id)}
              className="w-full text-[9px] py-2 rounded border border-[rgba(107,155,247,.2)] text-[#6b9bf7] hover:bg-[rgba(107,155,247,.08)] transition-all"
            >
              🚀 Promote to project shelf
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[rgba(242,239,234,.07)] flex items-center justify-between">
          <span className="text-[9px] text-ink-3 font-mono">
            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button onClick={handleDelete} className="text-[9px] text-ink-3 hover:text-[#e8654a] transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
