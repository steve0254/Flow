import { useEffect } from 'react'
import { useFlowStore } from '../store/useFlowStore'

export default function ToastStack() {
  const { toasts, dismissToast } = useFlowStore()

  return (
    <div className="fixed top-10 right-6 z-[60] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => <Toast key={t.id} id={t.id} title={t.title} body={t.body} onDismiss={dismissToast} />)}
    </div>
  )
}

function Toast({ id, title, body, onDismiss }: { id: string; title: string; body: string; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 5000)
    return () => clearTimeout(t)
  }, [id])

  return (
    <div
      className="pointer-events-auto flex items-start gap-2.5 bg-bg-4 border border-[rgba(200,245,154,.25)]
                 rounded-lg px-3.5 py-2.5 shadow-xl animate-fadeIn max-w-[280px]"
    >
      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#c8f59a] flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-ink-1 leading-snug truncate">{title}</p>
        <p className="text-[10px] text-ink-3 font-mono mt-0.5">{body}</p>
      </div>
      <button onClick={() => onDismiss(id)} className="ml-1 text-ink-3 hover:text-ink-1 text-xs leading-none">×</button>
    </div>
  )
}
