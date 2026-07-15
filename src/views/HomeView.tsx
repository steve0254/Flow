import { useFlowStore } from '../store/useFlowStore'
import ItemRow from '../components/ItemRow'
import RemindersBanner from '../components/RemindersBanner'
import { greeting, fmtTimer, ago } from '../lib/utils'
import { itemsDB, shelvesDB } from '../db/client'
import { TimerRing } from './FocusView'

export default function HomeView() {
  const { focus, queue, items, shelves, timer, startTimer, pauseTimer, stopTimer, markDone, setFocus, setScreen, openShelf, openDetail, missedReminders } = useFlowStore()

  const roots = shelves.filter(s => !s.parent_id).slice(0, 6)
  const todayItems = items.filter(i => !i.done && i.scheduled_at && isToday(i.scheduled_at))
  const recent = items.filter(i => !i.done).slice(0, 5)

  function isToday(iso: string) {
    return new Date(iso).toDateString() === new Date().toDateString()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-ink-1 font-normal">{greeting()}</h1>
          <p className="text-ink-3 text-sm mt-1">
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Missed reminders */}
        {missedReminders.length > 0 && (
          <div className="mb-6"><RemindersBanner /></div>
        )}

        {/* Current focus card */}
        <div className="bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-xl p-5 mb-6">
          {focus ? (
            <div className="flex items-start gap-6">
              <div className="flex-1 min-w-0">
                <p className="section-label">In focus</p>
                <h2 className="font-serif text-xl text-ink-1 leading-snug mb-3">{focus.content}</h2>

                <div className="flex items-center gap-2 flex-wrap">
                  {!timer.running
                    ? <button onClick={startTimer} className="btn btn-accent">▶ Start focus</button>
                    : <button onClick={pauseTimer} className="btn btn-ghost">⏸ Pause</button>
                  }
                  {(timer.running || timer.elapsed > 0) &&
                    <button onClick={stopTimer} className="btn btn-ghost">Stop</button>
                  }
                  <button onClick={() => markDone(focus.id)} className="btn btn-ghost">Done ✓</button>
                  <button onClick={() => openDetail(focus.id)} className="text-[9px] text-ink-3 hover:text-ink-2 underline underline-offset-2">Details</button>
                </div>
              </div>

              {/* Timer ring */}
              <div className="relative flex-shrink-0">
                <TimerRing elapsed={timer.elapsed} duration={timer.duration} size={80} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-xs text-ink-1">{fmtTimer(timer.elapsed, timer.duration)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="section-label">In focus</p>
              <p className="text-ink-3 text-sm italic mb-3">Nothing selected. Pick something to work on.</p>
              {queue.length > 0 && (
                <div className="space-y-1">
                  {queue.slice(0, 3).map(item => (
                    <button
                      key={item.id}
                      onClick={() => setFocus(item.id)}
                      className="w-full text-left text-sm text-ink-2 hover:text-ink-1 py-1.5 px-2 rounded hover:bg-bg-3 transition-colors"
                    >
                      {item.content}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Active items', value: items.filter(i => !i.done).length },
            { label: 'Done today', value: items.filter(i => i.done && isToday(i.done_at ?? '')).length },
            { label: 'Shelves', value: shelves.length },
          ].map(s => (
            <div key={s.label} className="bg-bg-2 border border-[rgba(242,239,234,.07)] rounded-lg p-3 text-center">
              <p className="font-serif text-2xl text-ink-1">{s.value}</p>
              <p className="text-[9px] text-ink-3 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Up next */}
          <div>
            <p className="section-label mb-3">Up next</p>
            {queue.length > 0 ? (
              <div className="space-y-px">
                {queue.map(item => (
                  <ItemRow key={item.id} item={item} onFocus={() => setScreen('focus')} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-3 italic">Queue is clear</p>
            )}
            <button onClick={() => setScreen('inbox')} className="mt-3 text-[9px] text-ink-3 hover:text-[#c8f59a] transition-colors">
              Open inbox →
            </button>
          </div>

          {/* Shelves shortcuts */}
          <div>
            <p className="section-label mb-3">Shelves</p>
            <div className="space-y-1">
              {roots.map(shelf => {
                const count = shelvesDB.activeCount(shelf.id)
                return (
                  <button
                    key={shelf.id}
                    onClick={() => openShelf(shelf.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded hover:bg-bg-3 transition-colors text-left group"
                  >
                    <span className="text-base">{shelf.icon}</span>
                    <span className="text-sm text-ink-2 group-hover:text-ink-1 flex-1">{shelf.name}</span>
                    {count > 0 && <span className="text-[9px] text-ink-3 font-mono">{count}</span>}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setScreen('shelves')} className="mt-3 text-[9px] text-ink-3 hover:text-[#c8f59a] transition-colors">
              All shelves →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
