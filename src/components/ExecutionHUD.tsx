import { useEffect, useState } from 'react'
import type { Item } from '../db/client'
import { getExecutionState, fmtDuration, fmtETA } from '../lib/execution'

interface Props {
  item: Item
  size?: number
}

export default function ExecutionHUD({ item, size = 120 }: Props) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const state = getExecutionState(item)
  if (!state) return null

  const stroke = 3
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - state.pct / 100)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(242,239,234,.06)" strokeWidth={stroke} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={state.isOverdue ? '#e8654a' : '#c8f59a'} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg text-ink-1 tabular-nums">{state.pct}%</span>
          <span className="text-[9px] text-ink-3 font-mono mt-0.5">
            {state.isOverdue ? 'overdue' : 'complete'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="font-mono text-xs text-ink-1">{fmtDuration(state.elapsedMs)}</p>
          <p className="text-[8px] text-ink-3 uppercase tracking-widest mt-0.5">Elapsed</p>
        </div>
        <div>
          <p className={`font-mono text-xs ${state.isOverdue ? 'text-[#e8654a]' : 'text-ink-1'}`}>
            {state.isOverdue ? 'overdue' : fmtDuration(state.remainingMs)}
          </p>
          <p className="text-[8px] text-ink-3 uppercase tracking-widest mt-0.5">Remaining</p>
        </div>
        <div>
          <p className="font-mono text-xs text-ink-1">{fmtETA(state.eta)}</p>
          <p className="text-[8px] text-ink-3 uppercase tracking-widest mt-0.5">Est. finish</p>
        </div>
      </div>
    </div>
  )
}
