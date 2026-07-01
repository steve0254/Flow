import { useState, useEffect, useRef } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import { classify, parseTime } from '../db/client'

export default function CaptureOverlay() {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<{ type: string; time: string | null } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { createItem, load } = useFlowStore()

  useEffect(() => {
    inputRef.current?.focus()

    // Re-focus when Electron sends focus signal
    const f = (window as any).flow
    f?.capture?.onFocus?.(() => {
      setText('')
      inputRef.current?.focus()
    })

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!text.trim()) { setPreview(null); return }
    const t = classify(text)
    const d = parseTime(text)
    setPreview({ type: t, time: d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : null })
  }, [text])

  function close() {
    const f = (window as any).flow
    if (f?.capture?.close) f.capture.close()
    else window.close()
  }

  function save() {
    if (!text.trim()) { close(); return }
    createItem(text.trim())
    load()
    const f = (window as any).flow
    if (f?.capture?.saved) f.capture.saved()
    else { setText(''); inputRef.current?.focus() }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') close()
  }

  return (
    <div className="flex flex-col h-screen bg-bg-3 overflow-hidden" style={{ borderRadius: 8 }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-1">
        {/* Type dot */}
        <span className="text-lg opacity-50 flex-shrink-0">
          {preview?.type === 'TASK' && '○'}
          {preview?.type === 'IDEA' && '◈'}
          {preview?.type === 'PROJECT' && '◫'}
          {preview?.type === 'REMINDER' && '◷'}
          {preview?.type === 'NOTE' && '◳'}
          {!preview && '○'}
        </span>

        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Capture a thought…"
          className="flex-1 bg-transparent text-ink-1 text-base outline-none placeholder-ink-3"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Preview badges */}
        {preview && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`pill pill-${preview.type}`}>{preview.type}</span>
            {preview.time && (
              <span className="text-[9px] text-[#e8654a] font-mono">{preview.time}</span>
            )}
          </div>
        )}

        {/* Hint */}
        <span className="text-[9px] text-ink-3 font-mono flex-shrink-0">↵ save · Esc close</span>
      </div>
    </div>
  )
}
