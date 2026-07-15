import { useFlowStore } from '../store/useFlowStore'

export default function RemindersBanner() {
  const { missedReminders, snoozeItem, rescheduleItem, dismissReminderItem, openDetail } = useFlowStore()

  if (missedReminders.length === 0) return null

  return (
    <div className="bg-[rgba(232,101,74,.06)] border border-[rgba(232,101,74,.2)] rounded-xl px-4 py-3">
      <p className="text-[9px] uppercase tracking-widest font-mono text-[#e8654a] mb-2">
        {missedReminders.length} missed reminder{missedReminders.length === 1 ? '' : 's'}
      </p>
      <div className="space-y-1.5">
        {missedReminders.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <button onClick={() => openDetail(item.id)} className="text-sm text-ink-1 hover:underline underline-offset-2 truncate text-left">
              {item.content}
            </button>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => snoozeItem(item.id, 30)} className="text-[9px] text-ink-3 hover:text-ink-1 px-1.5">Snooze 30m</button>
              <button onClick={() => rescheduleItem(item.id)} className="text-[9px] text-ink-3 hover:text-ink-1 px-1.5">Reschedule</button>
              <button onClick={() => dismissReminderItem(item.id)} className="text-[9px] text-ink-3 hover:text-[#e8654a] px-1.5">Skip</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
