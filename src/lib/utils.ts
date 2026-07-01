export const ago = (iso: string): string => {
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60_000)      return 'just now'
  if (d < 3_600_000)   return `${Math.floor(d/60_000)}m ago`
  if (d < 86_400_000)  return `${Math.floor(d/3_600_000)}h ago`
  if (d < 604_800_000) return `${Math.floor(d/86_400_000)}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export const fmtTime = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = d.getTime() - Date.now()
  if (Math.abs(diff) < 7_200_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const fmtElapsed = (s: number): string => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}:${pad(m)}:${pad(sec)}`
  return `${pad(m)}:${pad(sec)}`
}

export const fmtTimer = (elapsed: number, duration: number): string => {
  const rem = Math.max(0, duration - elapsed)
  return `${pad(Math.floor(rem/60))}:${pad(rem%60)}`
}

const pad = (n: number) => String(n).padStart(2, '0')

export const isToday = (iso: string): boolean =>
  new Date(iso).toDateString() === new Date().toDateString()

export const typeColor = (type: string): string => ({
  TASK:     '#c8f59a',
  IDEA:     '#a594f7',
  PROJECT:  '#6b9bf7',
  REMINDER: '#e8654a',
  NOTE:     '#a39e96',
  JOURNAL:  '#ecc873',
}[type] ?? '#a39e96')

export const greeting = (): string => {
  const h = new Date().getHours()
  if (h < 5)  return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Working late'
}

export const ICONS = ['📁','🌅','💡','📦','🎵','📖','🎓','⚡','🔥','🎯','✅','🛠️','🏠','💼','🎨','📝','🧠','🚀','💪','🌿','⭐','🛒','🖥️','📱','✈️','🎬','🎤']
