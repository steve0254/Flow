import { useFlowStore } from '../store/useFlowStore'
import { ago } from '../lib/utils'

export default function ResurfacePrompt() {
  const { surfaced, dismissSurface, setFocus, openDetail } = useFlowStore()
  if (!surfaced) return null

  return (
    <div className="fixed bottom-10 right-6 z-40 w-80 bg-bg-3 border border-[rgba(242,239,234,.1)] rounded-lg p-4 shadow-2xl animate-slideIn">
      <p className="text-[9px] text-ink-3 font-mono uppercase tracking-widest mb-2">Still relevant?</p>
      <p className="text-sm text-ink-1 leading-snug mb-1">{surfaced.content}</p>
      <p className="text-[10px] text-ink-3 mb-3">Captured {ago(surfaced.created_at)}</p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => dismissSurface(surfaced.id, true)}
          className="flex-1 py-1.5 rounded bg-[rgba(200,245,154,.1)] text-[#c8f59a] text-[10px] font-mono hover:bg-[rgba(200,245,154,.2)] transition-colors"
        >
          Keep it
        </button>
        <button
          onClick={() => { setFocus(surfaced.id); dismissSurface(surfaced.id, false) }}
          className="flex-1 py-1.5 rounded bg-bg-4 text-ink-2 text-[10px] font-mono hover:text-ink-1 transition-colors"
        >
          Focus now
        </button>
        <button
          onClick={() => dismissSurface(surfaced.id, false)}
          className="px-2 py-1.5 rounded text-ink-3 hover:text-[#e8654a] text-[10px] font-mono transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
