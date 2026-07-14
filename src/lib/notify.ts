import type { NotifyStyle } from '../db/client'

export type ToastListener = (toast: { id: string; title: string; body: string }) => void
const listeners = new Set<ToastListener>()

export function onToast(cb: ToastListener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function pushToast(title: string, body: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  listeners.forEach(cb => cb({ id, title, body }))
}

let audioCtx: AudioContext | null = null
function beep() {
  try {
    audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.36)
  } catch { /* audio unavailable — ignore */ }
}

export function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

/** Deliver a milestone/progress notification according to the item's chosen style. */
export function fireNotification(title: string, body: string, style: NotifyStyle = 'push') {
  // Always surface an in-app toast so nothing is missed even without OS permissions.
  pushToast(title, body)

  if (style === 'silent') return

  if (style === 'vibration') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([80, 40, 80])
    return
  }

  if (style === 'sound') {
    beep()
    return
  }

  // 'push' — system notification via Electron main process or the Web Notification API
  const f = (window as any).flow
  if (f?.notify) {
    f.notify(title, body)
    return
  }
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, silent: false })
    } else {
      beep()
    }
  } else {
    beep()
  }
}
