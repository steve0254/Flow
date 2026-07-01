import { useState, useRef } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import { itemsDB } from '../db/client'
import ItemRow from '../components/ItemRow'
import { fmtTime } from '../lib/utils'

export default function InboxView() {
  const { createItem, createMany, load, shelves, openShelf, items, searchQuery } = useFlowStore()
  const [bulkText, setBulkText] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [singleText, setSingleText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const inbox = searchQuery
    ? itemsDB.search(searchQuery).filter(i => !i.done)
    : itemsDB.getInbox()

  const dueSoon = items.filter(i => !i.done && i.reminder_at && new Date(i.reminder_at).getTime() - Date.now() < 86_400_000 * 3 && new Date(i.reminder_at).getTime() > Date.now())
  const neglected = itemsDB.getNeglected(5).slice(0, 3)

  function handleSingle(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && singleText.trim()) {
      createItem(singleText.trim())
      setSingleText('')
    }
  }

  function handleBulkSave() {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    createMany(lines)
    setBulkText('')
    setBulkMode(false)
  }

  return (
    <div className="h-full flex overflow-hidden">

      {/* Main inbox */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-xl text-ink-1">Inbox</h2>
              <p className="text-[10px] text-ink-3 mt-0.5">Unassigned items · process or assign to a shelf</p>
            </div>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`btn ${bulkMode ? 'btn-accent' : 'btn-ghost'}`}
            >
              {bulkMode ? 'Cancel bulk' : 'Bulk capture'}
            </button>
          </div>

          {/* Capture input */}
          {bulkMode ? (
            <div className="mb-5">
              <textarea
                autoFocus
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={"Paste multiple items — one per line\n\nCall mom\nBuy timber\nLearn Blender\nWrite next chapter"}
                rows={6}
                className="w-full input-base resize-none text-sm leading-relaxed font-mono"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={handleBulkSave} className="btn btn-accent">
                  Save {bulkText.split('\n').filter(l => l.trim()).length} items
                </button>
                <span className="text-[9px] text-ink-3">Each line becomes a separate item with auto-classification</span>
              </div>
            </div>
          ) : (
            <div className="mb-5">
              <input
                ref={inputRef}
                value={singleText}
                onChange={e => setSingleText(e.target.value)}
                onKeyDown={handleSingle}
                placeholder="Capture something… (Enter to save)"
                className="w-full input-base text-sm"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              />
            </div>
          )}

          {/* Inbox items */}
          {searchQuery ? (
            <div>
              <p className="section-label mb-2">Results for "{searchQuery}"</p>
              {inbox.length > 0
                ? inbox.map(i => <ItemRow key={i.id} item={i} showShelfBadges />)
                : <p className="text-xs text-ink-3 italic">Nothing found</p>
              }
            </div>
          ) : (
            <>
              {inbox.length > 0 ? (
                <div>
                  <p className="section-label mb-1">{inbox.length} unassigned</p>
                  {inbox.map(i => <ItemRow key={i.id} item={i} />)}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-ink-2 text-sm">Inbox is clear</p>
                  <p className="text-ink-3 text-xs mt-1">Everything has been assigned to a shelf</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-56 border-l border-[rgba(242,239,234,.06)] overflow-y-auto px-4 py-6 flex-shrink-0">

        {/* Due soon */}
        {dueSoon.length > 0 && (
          <div className="mb-5">
            <p className="section-label">Due soon</p>
            <div className="space-y-2">
              {dueSoon.map(item => (
                <div key={item.id} className="text-xs">
                  <p className="text-ink-2 leading-snug line-clamp-2">{item.content}</p>
                  <p className="text-[#e8654a] text-[9px] font-mono mt-0.5">{fmtTime(item.reminder_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Neglected */}
        {neglected.length > 0 && (
          <div className="mb-5">
            <p className="section-label">Sitting idle</p>
            <div className="space-y-2">
              {neglected.map(item => (
                <div key={item.id} className="text-xs text-ink-3 leading-snug line-clamp-2 py-1.5 border-b border-[rgba(242,239,234,.05)]">
                  {item.content}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shelf quick-assign */}
        <div>
          <p className="section-label">Shelves</p>
          <div className="space-y-0.5">
            {shelves.filter(s => !s.parent_id).map(s => (
              <button
                key={s.id}
                onClick={() => openShelf(s.id)}
                className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-bg-3 text-left text-xs text-ink-2 hover:text-ink-1 transition-colors"
              >
                <span>{s.icon}</span><span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
