import { useEffect } from 'react'
import { useFlowStore } from './store/useFlowStore'
import MainLayout from './components/MainLayout'
import CaptureOverlay from './components/CaptureOverlay'
import CompanionWidget from './components/CompanionWidget'
import { itemsDB } from './db/client'

const hash = window.location.hash

export default function App() {
  const { load, checkResurface, checkReminders } = useFlowStore()

  useEffect(() => {
    load()

    // Run recurring resets on startup
    itemsDB.resetRecurring()

    // Resurface check after 90s, then every 25min
    const t1 = setTimeout(() => checkResurface(), 90_000)
    const t2 = setInterval(() => checkResurface(), 25 * 60_000)

    // Reminder engine: milestone progress, due reminders, shelf routine triggers.
    // Runs immediately, then every 20s — cheap since it's all in-memory array scans.
    checkReminders()
    const t3 = setInterval(() => checkReminders(), 20_000)

    // Listen for DB refresh from main process (other windows changed data)
    const cleanup = (window as any).flow?.db?.onRefresh?.(() => load())

    return () => { clearTimeout(t1); clearInterval(t2); clearInterval(t3); cleanup?.() }
  }, [])

  if (hash === '#/capture')   return <CaptureOverlay />
  if (hash === '#/companion') return <CompanionWidget />
  return <MainLayout />
}
