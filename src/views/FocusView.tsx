import { useFlowStore } from '../store/useFlowStore'
import { fmtTimer, fmtElapsed, ago } from '../lib/utils'
import ItemRow from '../components/ItemRow'

// Exported so HomeView can use it
export function TimerRing({ elapsed, duration, size = 120, running = false }: {
  elapsed: number; duration: number; size?: number; running?: boolean
}) {
  const stroke = 3
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const progress = Math.min(elapsed / duration, 1)
  const offset = circ * (1 - progress)

  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(242,239,234,.06)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="#c8f59a" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none', opacity: progress > 0 ? 1 : 0.25 }}
      />
    </svg>
  )
}

export default function FocusView() {
  const {
    focus, queue, timer, setFocus, markDone,
    startTimer, pauseTimer, stopTimer,
    focusShelfId, focusShelfQueue, advanceShelfFocus,
    steps, loadSteps, toggleStep, openDetail,
  } = useFlowStore()

  const focusSteps = focus ? (steps[focus.id] ?? []) : []
  const hasTimer = timer.elapsed > 0 || timer.running

  if (focus && focusSteps.length === 0) loadSteps(focus.id)

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">

        {focus ? (
          <div className="w-full max-w-lg space-y-8">

            {/* Shelf sequence badge */}
            {focusShelfId && (
              <div className="flex items-center gap-2 justify-center">
                <span className="text-[9px] font-mono text-ink-3 uppercase tracking-widest">Running sequence</span>
                <span className="text-[9px] text-ink-3 font-mono">
                  {focusShelfQueue.filter(i => !i.done).length} remaining
                </span>
              </div>
            )}

            {/* Timer ring + focus text */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <TimerRing elapsed={timer.elapsed} duration={timer.duration} size={160} running={timer.running} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-2xl text-ink-1 tabular-nums">
                    {fmtTimer(timer.elapsed, timer.duration)}
                  </span>
                  {hasTimer && (
                    <span className="text-[9px] text-ink-3 font-mono mt-0.5">
                      {fmtElapsed(timer.elapsed)} elapsed
                    </span>
                  )}
                </div>
              </div>

              {/* Focus text */}
              <div>
                <h1 className="font-serif text-3xl text-ink-1 leading-snug max-w-sm">
                  {focus.content}
                </h1>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className={`pill pill-${focus.type}`}>{focus.type}</span>
                  <span className="text-[9px] text-ink-3">{ago(focus.created_at)}</span>
                  <button onClick={() => openDetail(focus.id)} className="text-[9px] text-ink-3 hover:text-ink-2 underline underline-offset-2">
                    Details
                  </button>
                </div>
              </div>
            </div>

            {/* Timer controls */}
            <div className="flex items-center justify-center gap-3">
              {!timer.running ? (
                <button onClick={startTimer} className="btn btn-accent px-6 py-2.5 text-sm">
                  {timer.elapsed > 0 ? '▶ Resume' : '▶ Start focus'}
                </button>
              ) : (
                <button onClick={pauseTimer} className="btn btn-ghost px-6 py-2.5 text-sm">
                  ⏸ Pause
                </button>
              )}
              {hasTimer && (
                <button onClick={stopTimer} className="btn btn-ghost">Stop</button>
              )}
              <button
                onClick={() => markDone(focus.id)}
                className="btn btn-ghost border-[rgba(200,245,154,.2)] text-[#c8f59a] hover:bg-[rgba(200,245,154,.06)]"
              >
                Done ✓
              </button>
            </div>

            {/* Steps */}
            {focusSteps.length > 0 && (
              <div className="bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-xl p-4">
                <p className="section-label mb-3">
                  Steps · {focusSteps.filter(s => s.done).length}/{focusSteps.length}
                </p>

                {/* Progress bar */}
                <div className="h-px bg-bg-4 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-[#c8f59a] transition-all"
                    style={{ width: `${(focusSteps.filter(s => s.done).length / focusSteps.length) * 100}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {focusSteps.map(step => (
                    <div key={step.id}
                      className="flex items-center gap-2.5 cursor-pointer group"
                      onClick={() => toggleStep(step.id, focus.id)}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 transition-all
                        ${step.done ? 'bg-[rgba(200,245,154,.3)] border-[#c8f59a]' : 'border-ink-3 group-hover:border-[#c8f59a]'}`}
                      />
                      <span className={`text-sm ${step.done ? 'line-through text-ink-3' : 'text-ink-1'}`}>
                        {step.content}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skip / clear focus */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setFocus(null)} className="text-[9px] text-ink-3 hover:text-ink-2 transition-colors">
                Clear focus
              </button>
              {focusShelfId && (
                <button onClick={advanceShelfFocus} className="text-[9px] text-ink-3 hover:text-[#c8f59a] transition-colors">
                  → Next in sequence
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Nothing in focus */
          <NothingInFocus queue={queue} onFocus={setFocus} />
        )}
      </div>

      {/* Queue strip at bottom */}
      {queue.length > 0 && focus && (
        <div className="border-t border-[rgba(242,239,234,.06)] px-8 py-4">
          <p className="section-label mb-2">Up next</p>
          <div className="grid grid-cols-3 gap-3">
            {queue.slice(0, 3).map(item => (
              <button
                key={item.id}
                onClick={() => setFocus(item.id)}
                className="text-left text-xs text-ink-2 hover:text-ink-1 py-2 px-3 rounded hover:bg-bg-3 transition-colors border border-transparent hover:border-[rgba(242,239,234,.07)] leading-snug line-clamp-2"
              >
                {item.content}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NothingInFocus({ queue, onFocus }: { queue: any[]; onFocus: (id: string) => void }) {
  return (
    <div className="text-center max-w-sm">
      <div className="relative mx-auto mb-6 w-32 h-32 opacity-20">
        <TimerRing elapsed={0} duration={1500} size={128} />
      </div>
      <h2 className="font-serif text-2xl text-ink-2 mb-2">Nothing in focus</h2>
      <p className="text-ink-3 text-sm mb-6">Choose something to work on.</p>

      {queue.length > 0 && (
        <div className="space-y-1.5 text-left">
          {queue.map(item => (
            <button
              key={item.id}
              onClick={() => onFocus(item.id)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg hover:bg-bg-3 border border-[rgba(242,239,234,.07)] hover:border-[rgba(200,245,154,.2)] transition-all text-sm text-ink-2 hover:text-ink-1 text-left"
            >
              <span className="flex-1 leading-snug">{item.content}</span>
              <span className="text-[9px] text-ink-3">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
