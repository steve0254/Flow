import { useEffect, useState } from 'react'

export default function PulseFlash() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const off = (window as any).flow?.onPulse?.(() => {
      setActive(true)
      setTimeout(() => setActive(false), 700)
    })
    return () => off?.()
  }, [])

  if (!active) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[999] animate-pulseFlash"
      style={{ boxShadow: 'inset 0 0 0 3px rgba(200,245,154,.5)' }}
    />
  )
}
