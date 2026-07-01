import { useEffect, useState } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import { fmtTimer } from '../lib/utils'

export default function CompanionWidget() {
  const { load, focus, queue, timer, startTimer, pauseTimer, markDone, createItem } = useFlowStore()
  const [cap, setCap] = useState('')
  const [showCap, setShowCap] = useState(false)

  useEffect(() => {
    load()
    const cleanup = (window as any).flow?.db?.onRefresh?.(() => load())
    return () => cleanup?.()
  }, [])

  function handleCapture(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && cap.trim()) {
      createItem(cap.trim()); setCap(''); setShowCap(false)
    }
    if (e.key === 'Escape') { setCap(''); setShowCap(false) }
  }

  return (
    <div className="h-screen flex flex-col bg-bg-2 p-3 select-none" style={{ borderRadius: 8 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-serif text-xs text-ink-2 tracking-wide">Flow</span>
        <button
          onClick={() => (window as any).flow?.companion?.toggle?.()}
          className="text-ink-3 hover:text-ink-1 text-sm leading-none"
        >×</button>
      </div>

      {/* Focus */}
      <div className="mb-3">
        <p className="section-label">Now</p>
        {focus ? (
          <>
            <p className="text-xs text-ink-1 leading-snug line-clamp-3 mb-2">{focus.content}</p>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] text-[#c8f59a]">{fmtTimer(timer.elapsed, timer.duration)}</span>
              {!timer.running
                ? <button onClick={startTimer} className="text-[9px] px-2 py-0.5 rounded bg-[rgba(200,245,154,.1)] text-[#c8f59a]">▶</button>
                : <button onClick={pauseTimer} className="text-[9px] px-2 py-0.5 rounded bg-bg-4 text-ink-2">⏸</button>
              }
            </div>
            <button
              onClick={() => markDone(focus.id)}
              className="w-full text-[9px] py-1 rounded border border-[rgba(242,239,234,.08)] text-ink-3 hover:border-[rgba(200,245,154,.3)] hover:text-[#c8f59a] transition-all"
            >
              Done ✓
            </button>
          </>
        ) : (
          <p className="text-[11px] text-ink-3 italic">Nothing in focus</p>
        )}
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="flex-1 overflow-hidden">
          <p className="section-label">Next</p>
          <div className="space-y-1.5">
            {queue.slice(0, 3).map(item => (
              <p key={item.id} className="text-[10px] text-ink-2 leading-snug line-clamp-1">
                · {item.content}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Capture */}
      <div className="mt-3 border-t border-[rgba(242,239,234,.07)] pt-2">
        {showCap ? (
          <input
            autoFocus
            value={cap}
            onChange={e => setCap(e.target.value)}
            onKeyDown={handleCapture}
            placeholder="Capture…"
            className="w-full bg-bg-4 rounded px-2 py-1 text-[10px] text-ink-1 placeholder-ink-3 outline-none"
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          />
        ) : (
          <button
            onClick={() => setShowCap(true)}
            className="w-full text-[9px] py-1 rounded border border-[rgba(242,239,234,.07)] text-ink-3 hover:text-[#c8f59a] hover:border-[rgba(200,245,154,.2)] transition-all"
          >
            + Capture
          </button>
        )}
      </div>
    </div>
  )
}
