import { useEffect } from 'react'
import { useFlowStore } from '../store/useFlowStore'

export default function UndoToast() {
  const { lastDeleted, undoDelete, load } = useFlowStore()
  if (!lastDeleted) return null

  useEffect(() => {
    const t = setTimeout(() => load(), 5000)
    return () => clearTimeout(t)
  }, [lastDeleted])

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-bg-4 border border-[rgba(242,239,234,.12)] rounded-full px-4 py-2 shadow-xl animate-fadeIn">
      <span className="text-xs text-ink-2 max-w-[200px] truncate">Deleted: {lastDeleted.content}</span>
      <button
        onClick={undoDelete}
        className="text-[10px] font-mono text-[#c8f59a] hover:opacity-80 transition-opacity"
      >
        Undo
      </button>
    </div>
  )
}
