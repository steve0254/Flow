import { DURATION_UNITS } from '../lib/execution'
import type { DurationUnit } from '../db/client'

interface Props {
  value: number | null
  unit: DurationUnit | null
  onChange: (value: number | null, unit: DurationUnit | null) => void
  compact?: boolean
}

export default function DurationPicker({ value, unit, onChange, compact }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={value ?? ''}
        onChange={e => {
          const v = e.target.value === '' ? null : Math.max(0, +e.target.value)
          onChange(v, v !== null ? (unit ?? 'minutes') : null)
        }}
        placeholder="0"
        className={`bg-bg-4 rounded px-2 py-1 text-ink-1 outline-none border border-[rgba(242,239,234,.08)]
          focus:border-[rgba(200,245,154,.4)] nodrag ${compact ? 'w-14 text-xs' : 'w-16 text-sm'}`}
        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      />
      <select
        value={unit ?? 'minutes'}
        onChange={e => onChange(value, e.target.value as DurationUnit)}
        className={`bg-bg-4 rounded px-2 py-1 text-ink-2 outline-none border border-[rgba(242,239,234,.08)] nodrag
          ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {DURATION_UNITS.map(u => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </div>
  )
}
