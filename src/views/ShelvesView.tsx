import { useState } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import { itemsDB, shelvesDB } from '../db/client'
import ItemRow from '../components/ItemRow'
import { ICONS } from '../lib/utils'

export default function ShelvesView() {
  const { shelves, currentShelf, openShelf, items, createItem, load, searchQuery, shelfFilter, setShelfFilter } = useFlowStore()
  const [newShelfName, setNewShelfName] = useState('')
  const [newShelfIcon, setNewShelfIcon] = useState('📁')
  const [showNewShelf, setShowNewShelf] = useState(false)
  const [editShelfId, setEditShelfId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [capText, setCapText] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)

  const shelf = currentShelf ? shelvesDB.getById(currentShelf) : null
  const children = currentShelf ? shelvesDB.getChildren(currentShelf) : shelvesDB.getRoots()
  const path = currentShelf ? shelvesDB.getPath(currentShelf) : []

  let shelfItems = currentShelf ? itemsDB.getForShelf(currentShelf) : []
  if (searchQuery) shelfItems = itemsDB.search(searchQuery)
  if (shelfFilter === 'active') shelfItems = shelfItems.filter(i => !i.done)
  if (shelfFilter === 'done')   shelfItems = shelfItems.filter(i => !!i.done)

  function createShelf() {
    if (!newShelfName.trim()) return
    shelvesDB.create(newShelfName.trim(), newShelfIcon, currentShelf ?? null)
    setNewShelfName(''); setShowNewShelf(false); setNewShelfIcon('📁')
    load()
  }

  function deleteShelf(id: string) {
    if (!confirm('Delete this shelf and remove all items from it? (Items are not deleted, just unassigned)')) return
    shelvesDB.delete(id)
    if (currentShelf === id) useFlowStore.getState().setScreen('shelves')
    load()
  }

  function handleCapture(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && capText.trim() && currentShelf) {
      createItem(capText.trim(), undefined, [currentShelf])
      setCapText('')
    }
  }

  function startFocus() {
    if (currentShelf) useFlowStore.getState().startShelfFocus(currentShelf)
  }

  return (
    <div className="h-full flex overflow-hidden">

      {/* Left: tree */}
      <div className="w-52 border-r border-[rgba(242,239,234,.06)] overflow-y-auto flex-shrink-0 py-4">
        {/* Breadcrumb */}
        {path.length > 0 && (
          <div className="px-3 mb-3">
            <button
              onClick={() => useFlowStore.getState().setScreen('shelves')}
              className="text-[9px] text-ink-3 hover:text-ink-2 transition-colors"
            >
              ← All shelves
            </button>
          </div>
        )}

        {/* Roots or children at parent level */}
        <div className="px-2">
          {shelvesDB.getRoots().map(s => (
            <ShelfTreeItem
              key={s.id}
              shelfId={s.id}
              depth={0}
              current={currentShelf}
              onOpen={openShelf}
              onDelete={deleteShelf}
              onEdit={id => { setEditShelfId(id); setEditName(shelvesDB.getById(id)?.name ?? '') }}
            />
          ))}
        </div>

        {/* New shelf */}
        <div className="px-3 mt-3">
          {showNewShelf ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="text-xl w-8 h-8 rounded bg-bg-4 flex items-center justify-center hover:bg-bg-5"
                >
                  {newShelfIcon}
                </button>
                <input
                  autoFocus
                  value={newShelfName}
                  onChange={e => setNewShelfName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createShelf(); if (e.key === 'Escape') setShowNewShelf(false) }}
                  placeholder="Shelf name…"
                  className="flex-1 bg-bg-4 rounded px-2 py-1 text-xs text-ink-1 outline-none border border-[rgba(200,245,154,.3)]"
                  style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                />
              </div>
              {showIconPicker && (
                <div className="flex flex-wrap gap-1 p-2 bg-bg-4 rounded border border-[rgba(242,239,234,.08)] max-h-32 overflow-y-auto">
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => { setNewShelfIcon(ic); setShowIconPicker(false) }} className="text-base hover:scale-110 transition-transform">
                      {ic}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={createShelf} className="btn btn-accent w-full">Create shelf</button>
            </div>
          ) : (
            <button onClick={() => setShowNewShelf(true)} className="text-[9px] text-ink-3 hover:text-[#c8f59a] transition-colors">
              + New shelf
            </button>
          )}
        </div>
      </div>

      {/* Right: shelf contents */}
      <div className="flex-1 overflow-y-auto">
        {currentShelf && shelf ? (
          <div className="px-6 py-6 max-w-2xl">

            {/* Shelf header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-serif text-2xl text-ink-1 flex items-center gap-3">
                  <span>{shelf.icon}</span>
                  {editShelfId === shelf.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => { shelvesDB.update(shelf.id, { name: editName }); setEditShelfId(null); load() }}
                      onKeyDown={e => { if (e.key === 'Enter') { shelvesDB.update(shelf.id, { name: editName }); setEditShelfId(null); load() } }}
                      className="bg-transparent border-b border-[rgba(200,245,154,.4)] outline-none text-ink-1"
                      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    />
                  ) : (
                    <span onClick={() => { setEditShelfId(shelf.id); setEditName(shelf.name) }} className="cursor-text hover:opacity-80">
                      {shelf.name}
                    </span>
                  )}
                </h2>

                {/* Breadcrumb path */}
                {path.length > 1 && (
                  <div className="flex items-center gap-1 mt-1">
                    {path.slice(0, -1).map((p, i) => (
                      <span key={p.id}>
                        <button onClick={() => openShelf(p.id)} className="text-[9px] text-ink-3 hover:text-ink-2">{p.name}</button>
                        {i < path.length - 2 && <span className="text-[9px] text-ink-4 mx-1">›</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={startFocus} className="btn btn-accent">▶ Run focus</button>
                <button onClick={() => deleteShelf(shelf.id)} className="btn btn-ghost text-[#e8654a] hover:border-[#e8654a]">Delete</button>
              </div>
            </div>

            {/* Sub-shelves */}
            {children.length > 0 && (
              <div className="mb-5">
                <p className="section-label">Sub-shelves</p>
                <div className="flex flex-wrap gap-2">
                  {children.map(c => (
                    <button key={c.id} onClick={() => openShelf(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-3 hover:bg-bg-4 border border-[rgba(242,239,234,.07)] text-sm text-ink-2 hover:text-ink-1 transition-all"
                    >
                      <span>{c.icon}</span><span>{c.name}</span>
                      <span className="text-[9px] text-ink-3 font-mono ml-1">{shelvesDB.activeCount(c.id)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
              <p className="section-label mb-0">Filter:</p>
              {(['all','active','done'] as const).map(f => (
                <button key={f} onClick={() => setShelfFilter(f)}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${shelfFilter === f ? 'bg-[rgba(200,245,154,.1)] text-[#c8f59a]' : 'text-ink-3 hover:text-ink-2'}`}
                >{f}</button>
              ))}
            </div>

            {/* Capture into shelf */}
            <div className="mb-4">
              <input
                value={capText}
                onChange={e => setCapText(e.target.value)}
                onKeyDown={handleCapture}
                placeholder={`Add to ${shelf.name}… (Enter)`}
                className="w-full input-base text-sm"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              />
            </div>

            {/* Items */}
            {shelfItems.length > 0 ? (
              <div className="space-y-px">
                {shelfItems.map(item => <ItemRow key={item.id} item={item} />)}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-ink-3 text-sm italic">This shelf is empty</p>
                <p className="text-ink-3 text-xs mt-1">Capture something above or assign items from Inbox</p>
              </div>
            )}
          </div>
        ) : (
          /* No shelf selected: show all shelves grid */
          <div className="px-6 py-6">
            <h2 className="font-serif text-xl text-ink-1 mb-5">Shelves</h2>
            {shelvesDB.getRoots().length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {shelvesDB.getRoots().map(s => {
                  const count = shelvesDB.activeCount(s.id)
                  const subs  = shelvesDB.getChildren(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => openShelf(s.id)}
                      className="text-left bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-xl p-4 hover:bg-bg-3 hover:border-[rgba(242,239,234,.12)] transition-all group"
                    >
                      <div className="text-2xl mb-2">{s.icon}</div>
                      <p className="text-sm text-ink-1 font-medium truncate">{s.name}</p>
                      <p className="text-[9px] text-ink-3 mt-1">
                        {count} active{subs.length > 0 ? ` · ${subs.length} sub-shelves` : ''}
                      </p>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-ink-3 text-sm italic">No shelves yet</p>
                <p className="text-ink-3 text-xs mt-1">Create a shelf to organize your items</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ShelfTreeItem({ shelfId, depth, current, onOpen, onDelete, onEdit }: {
  shelfId: string; depth: number; current: string | null
  onOpen: (id: string) => void; onDelete: (id: string) => void; onEdit: (id: string) => void
}) {
  const { shelves } = useFlowStore()
  const [open, setOpen] = useState(depth === 0)
  const shelf = shelves.find(s => s.id === shelfId)
  if (!shelf) return null
  const children = shelves.filter(s => s.parent_id === shelfId).sort((a,b) => a.sort_order - b.sort_order)
  const count = shelvesDB.activeCount(shelfId)

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 py-1.5 px-2 rounded transition-colors cursor-pointer
          ${current === shelfId ? 'bg-bg-4 text-ink-1' : 'text-ink-2 hover:bg-bg-3 hover:text-ink-1'}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {children.length > 0 ? (
          <button onClick={e => { e.stopPropagation(); setOpen(!open) }} className="text-[8px] text-ink-3 w-3">
            {open ? '▾' : '▸'}
          </button>
        ) : <span className="w-3" />}

        <button onClick={() => onOpen(shelfId)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
          <span className="text-sm flex-shrink-0">{shelf.icon}</span>
          <span className="text-xs truncate">{shelf.name}</span>
          {count > 0 && <span className="text-[9px] text-ink-3 font-mono ml-auto">{count}</span>}
        </button>

        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
          <button onClick={() => onEdit(shelfId)} className="text-[9px] text-ink-3 hover:text-ink-2 px-0.5">✎</button>
          <button onClick={() => onDelete(shelfId)} className="text-[9px] text-ink-3 hover:text-[#e8654a] px-0.5">✕</button>
        </div>
      </div>
      {open && children.map(c => (
        <ShelfTreeItem key={c.id} shelfId={c.id} depth={depth+1} current={current} onOpen={onOpen} onDelete={onDelete} onEdit={onEdit} />
      ))}
    </div>
  )
}
