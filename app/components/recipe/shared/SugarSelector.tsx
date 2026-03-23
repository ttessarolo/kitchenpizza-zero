import { useState } from 'react'
import { SUGAR_TYPES } from '@/local_data'

interface SugarSelectorProps {
  value: string
  onChange: (v: string) => void
}

export function SugarSelector({ value, onChange }: SugarSelectorProps) {
  const [custom, setCustom] = useState(false)

  if (custom || !SUGAR_TYPES.some((s) => s.key === value)) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs font-normal text-foreground bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
      />
    )
  }

  return (
    <select
      value={value}
      onChange={(e) =>
        e.target.value === '__custom__' ? setCustom(true) : onChange(e.target.value)
      }
      className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
    >
      {SUGAR_TYPES.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
      <option value="__custom__">Altro...</option>
    </select>
  )
}
