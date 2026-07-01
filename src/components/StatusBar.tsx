import { useState, useEffect } from 'react'
import { useFlowStore } from '../store/useFlowStore'

export default function StatusBar() {
  const { focus, timer, items } = useFlowStore()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  const activeCount = items.filter(i => !i.done).length

  return (
    <div className="h-6 bg-bg-2 border-t border-[rgba(242,239,234,.06)] flex items-center px-3 gap-4 flex-shrink-0">
      <span className="flex items-center gap-1.5 text-[9px] text-ink-3 font-mono">
        <span className={`w-1.5 h-1.5 rounded-full ${timer.running ? 'bg-[#c8f59a] animate-pulse' : 'bg-bg-4'}`} />
        {timer.running ? 'Flow is running' : 'Flow'}
      </span>

      {focus && (
        <span className="text-[9px] text-ink-3 truncate max-w-[200px]">
          ◎ {focus.content}
        </span>
      )}

      <span className="ml-auto text-[9px] text-ink-3 font-mono">
        {activeCount} active
      </span>

      <span className="text-[9px] text-ink-3 font-mono">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
