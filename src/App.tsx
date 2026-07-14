import { useEffect } from 'react'
import { useFlowStore } from './store/useFlowStore'
import MainLayout from './components/MainLayout'
import CaptureOverlay from './components/CaptureOverlay'
import CompanionWidget from './components/CompanionWidget'
import { itemsDB } from './db/client'
import { requestNotificationPermission } from './lib/notify'
import ToastStack from './components/ToastStack'

const hash = window.location.hash

export default function App() {
  const { load, checkResurface, startClock } = useFlowStore()

  useEffect(() => {
    load()
    requestNotificationPermission()

    // Run recurring resets on startup
    itemsDB.resetRecurring()

    // Resurface check after 90s, then every 25min
    const t1 = setTimeout(() => checkResurface(), 90_000)
    const t2 = setInterval(() => checkResurface(), 25 * 60_000)

    // Duration/execution clock — ticks every second, checks milestone notifications
    const stopClock = startClock()

    // Listen for DB refresh from main process (other windows changed data)
    const cleanup = (window as any).flow?.db?.onRefresh?.(() => load())

    return () => { clearTimeout(t1); clearInterval(t2); stopClock(); cleanup?.() }
  }, [])

  if (hash === '#/capture')   return <CaptureOverlay />
  if (hash === '#/companion') return <CompanionWidget />
  return <><MainLayout /><ToastStack /></>
}
