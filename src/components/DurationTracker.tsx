import { useState } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import type { Item, DurationUnit, NotifyStyle } from '../db/client'
import { computeDurationProgress, DURATION_UNITS, UNIT_LABEL, fmtDurationMs, fmtETA, parseMilestones } from '../lib/duration'

const MILESTONE_PRESETS = [25, 50, 75]
const NOTIFY_STYLES: { key: NotifyStyle; label: string; icon: string }[] = [
  { key: 'push',      label: 'Push',      icon: '🔔' },
  { key: 'sound',     label: 'Sound',     icon: '🔊' },
  { key: 'vibration', label: 'Vibration', icon: '📳' },
  { key: 'silent',    label: 'Silent',    icon: '🔕' },
]

export default function DurationTracker({ item }: { item: Item }) {
  const {
    clockTick, setDuration, startExecution, pauseExecution, resumeExecution, resetExecution,
    setMilestones, setNotifyRemaining, setNotifyStyle,
  } = useFlowStore()

  const [customPct, setCustomPct] = useState('')
  void clockTick // subscribe so this component re-renders every second while a clock is running

  const progress = computeDurationProgress(item)
  const enabledMilestones = parseMilestones(item.milestones || '[]')

  function toggleMilestone(pct: number) {
    const next = enabledMilestones.includes(pct)
      ? enabledMilestones.filter(p => p !== pct)
      : [...enabledMilestones, pct]
    setMilestones(item.id, next)
  }

  function addCustomMilestone() {
    const n = Math.round(Number(customPct))
    if (n > 0 && n < 100 && !enabledMilestones.includes(n)) setMilestones(item.id, [...enabledMilestones, n])
    setCustomPct('')
  }

  return (
    <div>
      <p className="section-label">Duration & Progress</p>

      {/* Duration input */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="number" min={0} step="any"
          value={item.duration_value ?? ''}
          placeholder="e.g. 45"
          onChange={e => setDuration(item.id, e.target.value ? +e.target.value : null, item.duration_unit ?? 'minutes')}
          className="input-base text-xs w-20 nodrag"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
        />
        <select
          value={item.duration_unit ?? 'minutes'}
          onChange={e => setDuration(item.id, item.duration_value, e.target.value as DurationUnit)}
          className="input-base text-xs flex-1 nodrag"
        >
          {DURATION_UNITS.map(u => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
        </select>
      </div>

      {progress.hasDuration && (
        <>
          {/* Live progress bar */}
          <div className="bg-bg-3 border border-[rgba(242,239,234,.07)] rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-ink-3 font-mono uppercase tracking-widest">
                {progress.isComplete ? 'Complete' : progress.isRunning ? 'Running' : progress.isStarted ? 'Paused' : 'Not started'}
              </span>
              <span className="text-xs font-mono text-ink-1 tabular-nums">{Math.round(progress.percent)}%</span>
            </div>

            <div className="h-1.5 bg-bg-4 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full transition-all ${progress.isComplete ? 'bg-[#c8f59a]' : 'bg-[#c8f59a]'}`}
                style={{ width: `${progress.percent}%`, transitionDuration: progress.isRunning ? '1s' : '0.3s' }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-ink-3">
              <span>{fmtDurationMs(progress.elapsedMs)} elapsed</span>
              <span>{progress.isComplete ? 'Done' : `${fmtDurationMs(progress.remainingMs)} left`}</span>
            </div>
            {progress.eta && !progress.isComplete && (
              <div className="mt-1.5 text-[10px] text-ink-3">
                Est. finish: <span className="text-ink-2">{fmtETA(progress.eta)}</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2 mt-3">
              {!progress.isStarted && (
                <button onClick={() => startExecution(item.id)} className="btn btn-accent px-3 py-1 text-[9px]">▶ Start</button>
              )}
              {progress.isStarted && progress.isRunning && (
                <button onClick={() => pauseExecution(item.id)} className="btn btn-ghost px-3 py-1 text-[9px]">⏸ Pause</button>
              )}
              {progress.isStarted && !progress.isRunning && !progress.isComplete && (
                <button onClick={() => resumeExecution(item.id)} className="btn btn-accent px-3 py-1 text-[9px]">▶ Resume</button>
              )}
              {progress.isStarted && (
                <button onClick={() => resetExecution(item.id)} className="text-[9px] text-ink-3 hover:text-ink-2 underline underline-offset-2">Reset</button>
              )}
            </div>
          </div>

          {/* Milestone notifications */}
          <div className="mb-3">
            <p className="text-[9px] text-ink-3 uppercase tracking-widest font-mono mb-1.5">Notify at</p>
            <div className="flex flex-wrap gap-1.5">
              {MILESTONE_PRESETS.map(pct => (
                <button key={pct} onClick={() => toggleMilestone(pct)}
                  className={`text-[9px] font-mono px-2 py-1 rounded border transition-all
                    ${enabledMilestones.includes(pct)
                      ? 'border-[rgba(200,245,154,.4)] text-[#c8f59a] bg-[rgba(200,245,154,.08)]'
                      : 'border-[rgba(242,239,234,.08)] text-ink-3 hover:text-ink-2'}`}
                >{pct}%</button>
              ))}
              {enabledMilestones.filter(p => !MILESTONE_PRESETS.includes(p)).map(pct => (
                <button key={pct} onClick={() => toggleMilestone(pct)}
                  className="text-[9px] font-mono px-2 py-1 rounded border border-[rgba(200,245,154,.4)] text-[#c8f59a] bg-[rgba(200,245,154,.08)]"
                >{pct}% ×</button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number" min={1} max={99} value={customPct} placeholder="%"
                  onChange={e => setCustomPct(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomMilestone()}
                  className="w-12 bg-bg-4 rounded px-1.5 py-1 text-[9px] font-mono text-center outline-none nodrag"
                  style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                />
                <button onClick={addCustomMilestone} className="text-[9px] text-ink-3 hover:text-[#c8f59a]">+</button>
              </div>
            </div>
          </div>

          {/* Notify with X minutes remaining */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] text-ink-3 uppercase tracking-widest font-mono">Remind with</span>
            <input
              type="number" min={0} value={item.notify_remaining_min ?? ''}
              placeholder="10"
              onChange={e => setNotifyRemaining(item.id, e.target.value ? +e.target.value : null)}
              className="w-14 bg-bg-4 rounded px-2 py-1 text-[10px] font-mono text-center outline-none nodrag"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
            <span className="text-[9px] text-ink-3">min left</span>
          </div>

          {/* Notification style */}
          <div>
            <p className="text-[9px] text-ink-3 uppercase tracking-widest font-mono mb-1.5">Alert style</p>
            <div className="flex gap-1.5">
              {NOTIFY_STYLES.map(({ key, label, icon }) => (
                <button key={key} onClick={() => setNotifyStyle(item.id, key)}
                  className={`flex-1 text-[9px] font-mono px-2 py-1.5 rounded border transition-all
                    ${item.notify_style === key
                      ? 'border-[rgba(200,245,154,.4)] text-[#c8f59a] bg-[rgba(200,245,154,.08)]'
                      : 'border-[rgba(242,239,234,.08)] text-ink-3 hover:text-ink-2'}`}
                >{icon} {label}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
