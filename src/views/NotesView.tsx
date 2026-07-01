import { useEffect, useRef } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import { ago } from '../lib/utils'

export default function NotesView() {
  const { notes, currentNote, newNote, updateNote, deleteNote, setCurrentNote, loadNotes } = useFlowStore()
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadNotes() }, [])

  const active = notes.find(n => n.id === currentNote)

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Tab' && e.target === titleRef.current) {
      e.preventDefault(); bodyRef.current?.focus()
    }
  }

  return (
    <div className="h-full flex overflow-hidden">

      {/* Left: notes list */}
      <div className="w-52 border-r border-[rgba(242,239,234,.06)] flex flex-col flex-shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[rgba(242,239,234,.06)]">
          <span className="text-xs text-ink-2 font-medium">Notes</span>
          <button
            onClick={() => newNote()}
            className="text-[#c8f59a] hover:opacity-80 text-sm font-light transition-opacity"
            title="New note"
          >＋</button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {notes.length > 0 ? notes.map(note => (
            <button
              key={note.id}
              onClick={() => setCurrentNote(note.id)}
              className={`w-full text-left px-3 py-3 border-b border-[rgba(242,239,234,.04)] transition-colors
                ${currentNote === note.id ? 'bg-bg-4' : 'hover:bg-bg-3'}`}
            >
              <p className="text-xs text-ink-1 truncate font-medium">
                {note.title || <span className="italic text-ink-3">Untitled</span>}
              </p>
              <p className="text-[9px] text-ink-3 mt-0.5 line-clamp-2 leading-relaxed">
                {note.body.slice(0, 60) || 'Empty note'}
              </p>
              <p className="text-[8px] text-ink-4 mt-1 font-mono">{ago(note.updated_at)}</p>
            </button>
          )) : (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-ink-3 italic">No notes yet</p>
              <button onClick={() => newNote()} className="text-[9px] text-[#c8f59a] mt-2 hover:opacity-80">
                Create first note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {active ? (
          <>
            {/* Editor header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(242,239,234,.06)] flex-shrink-0">
              <span className="text-[9px] text-ink-3 font-mono">
                {new Date(active.updated_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                {' · '}
                {active.body.split(/\s+/).filter(Boolean).length} words
              </span>
              <button
                onClick={() => { if (confirm('Delete this note?')) deleteNote(active.id) }}
                className="text-[9px] text-ink-3 hover:text-[#e8654a] transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Title */}
            <div className="px-8 pt-6 pb-2 flex-shrink-0">
              <input
                ref={titleRef}
                value={active.title}
                onChange={e => updateNote(active.id, { title: e.target.value })}
                onKeyDown={handleKey}
                placeholder="Title"
                className="w-full bg-transparent text-2xl font-serif text-ink-1 placeholder-ink-4 outline-none"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden px-8 pb-8">
              <textarea
                ref={bodyRef}
                value={active.body}
                onChange={e => updateNote(active.id, { body: e.target.value })}
                placeholder="Start writing…"
                className="w-full h-full bg-transparent text-sm text-ink-1 placeholder-ink-3 outline-none resize-none leading-relaxed"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-ink-3 text-sm italic">Select a note or create one</p>
              <button onClick={() => newNote()} className="mt-3 btn btn-ghost">New note</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
