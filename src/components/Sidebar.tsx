import { useState } from 'react'
import { useFlowStore, Screen } from '../store/useFlowStore'
import { shelvesDB } from '../db/client'
import { fmtTimer } from '../lib/utils'

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'home',      label: 'Home',      icon: '⌂' },
  { id: 'inbox',     label: 'Inbox',     icon: '◉' },
  { id: 'focus',     label: 'Focus',     icon: '◎' },
  { id: 'shelves',   label: 'Shelves',   icon: '▤' },
  { id: 'notes',     label: 'Notes',     icon: '✎' },
  { id: 'analytics', label: 'Analytics', icon: '◈' },
]

export default function Sidebar() {
  const { screen, setScreen, openShelf, shelves, focus, queue, timer, startTimer, pauseTimer, stopTimer, markDone, createItem } = useFlowStore()
  const [showCapInput, setShowCapInput] = useState(false)
  const [capText, setCapText] = useState('')

  const roots = shelves.filter(s => !s.parent_id).sort((a, b) => a.sort_order - b.sort_order)

  function handleCapture(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && capText.trim()) {
      createItem(capText.trim())
      setCapText('')
      setShowCapInput(false)
    }
    if (e.key === 'Escape') { setCapText(''); setShowCapInput(false) }
  }

  function openGlobalCapture() {
    const f = (window as any).flow
    if (f?.capture?.open) f.capture.open()
    else setShowCapInput(true)
  }

  return (
    <aside className="w-52 flex flex-col bg-bg-2 border-r border-[rgba(242,239,234,.06)] flex-shrink-0 overflow-hidden">

      {/* Nav */}
      <nav className="p-2 space-y-0.5 border-b border-[rgba(242,239,234,.06)]">
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setScreen(n.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all duration-100 text-left
              ${screen === n.id
                ? 'bg-bg-4 text-ink-1'
                : 'text-ink-2 hover:text-ink-1 hover:bg-bg-3'
              }`}
          >
            <span className="text-base leading-none w-4 text-center opacity-70">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Current focus (mini) */}
      {focus && (
        <div className="p-3 border-b border-[rgba(242,239,234,.06)]">
          <p className="section-label">Now</p>
          <p className="text-xs text-ink-1 leading-snug line-clamp-2 mb-2">{focus.content}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] text-[#c8f59a]">{fmtTimer(timer.elapsed, timer.duration)}</span>
            {!timer.running
              ? <button onClick={startTimer} className="text-[9px] px-2 py-0.5 rounded bg-[rgba(200,245,154,.1)] text-[#c8f59a] hover:bg-[rgba(200,245,154,.2)] transition-colors">Start</button>
              : <button onClick={pauseTimer} className="text-[9px] px-2 py-0.5 rounded bg-bg-4 text-ink-2 hover:text-ink-1 transition-colors">Pause</button>
            }
            {(timer.running || timer.elapsed > 0) &&
              <button onClick={stopTimer} className="text-[9px] px-1.5 py-0.5 rounded text-ink-3 hover:text-ink-2">✕</button>
            }
          </div>
          <button
            onClick={() => markDone(focus.id)}
            className="mt-2 w-full text-[10px] py-1 rounded border border-[rgba(242,239,234,.08)] text-ink-2 hover:border-[rgba(200,245,154,.3)] hover:text-[#c8f59a] transition-all"
          >
            Mark done
          </button>
        </div>
      )}

      {/* Shelves tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {roots.length > 0 && (
          <>
            <p className="section-label px-1 mt-1">Shelves</p>
            {roots.map(shelf => (
              <ShelfRow key={shelf.id} shelfId={shelf.id} depth={0} onOpen={openShelf} currentShelf={null} />
            ))}
          </>
        )}
      </div>

      {/* Quick capture */}
      <div className="p-2 border-t border-[rgba(242,239,234,.06)]">
        {showCapInput ? (
          <input
            autoFocus
            value={capText}
            onChange={e => setCapText(e.target.value)}
            onKeyDown={handleCapture}
            placeholder="Capture… (Enter to save)"
            className="w-full bg-bg-4 border border-[rgba(200,245,154,.3)] rounded px-2.5 py-1.5 text-xs text-ink-1 placeholder-ink-3 outline-none"
          />
        ) : (
          <button
            onClick={openGlobalCapture}
            className="w-full py-2 rounded border border-[rgba(242,239,234,.08)] text-xs text-ink-2 hover:border-[rgba(200,245,154,.3)] hover:text-[#c8f59a] hover:bg-[rgba(200,245,154,.04)] transition-all"
          >
            + Capture
            <span className="ml-2 text-[9px] text-ink-3 font-mono">Ctrl+Space</span>
          </button>
        )}
      </div>
    </aside>
  )
}

function ShelfRow({ shelfId, depth, onOpen, currentShelf }: {
  shelfId: string; depth: number; onOpen: (id: string) => void; currentShelf: string | null
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
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer group transition-colors
          ${currentShelf === shelfId ? 'bg-bg-4 text-ink-1' : 'text-ink-2 hover:text-ink-1 hover:bg-bg-3'}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {children.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setOpen(!open) }}
            className="text-[8px] text-ink-3 w-3 flex-shrink-0"
          >
            {open ? '▾' : '▸'}
          </button>
        )}
        {children.length === 0 && <span className="w-3" />}
        <button
          onClick={() => onOpen(shelfId)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <span className="text-sm flex-shrink-0">{shelf.icon}</span>
          <span className="text-xs truncate">{shelf.name}</span>
          {count > 0 && (
            <span className="ml-auto text-[9px] text-ink-3 font-mono flex-shrink-0">{count}</span>
          )}
        </button>
      </div>
      {open && children.map(c => (
        <ShelfRow key={c.id} shelfId={c.id} depth={depth + 1} onOpen={onOpen} currentShelf={currentShelf} />
      ))}
    </div>
  )
}
