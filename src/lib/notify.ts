import type { NotifyStyle } from '../db/client'

let browserPermissionAsked = false

export function notify(title: string, body: string, style: NotifyStyle = 'push') {
  const f = (window as any).flow
  if (f?.notify) {
    f.notify(title, body, style)
    return
  }
  // Web dev fallback
  if (style === 'silent') return
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, silent: style === 'vibration' })
  } else if (Notification.permission !== 'denied' && !browserPermissionAsked) {
    browserPermissionAsked = true
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification(title, { body })
    })
  }
}
