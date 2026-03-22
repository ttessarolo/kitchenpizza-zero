import { useState } from 'react'
import { LIQUID_PRESETS } from '@/local_data'

interface LiquidSelectorProps {
  value: string
  onChange: (v: string) => void
}

export function LiquidSelector({ value, onChange }: LiquidSelectorProps) {
  const [custom, setCustom] = useState(false)

  if (custom || !LIQUID_PRESETS.includes(value as typeof LIQUID_PRESETS[number])) {
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
        e.target.value === 'Altro...' ? setCustom(true) : onChange(e.target.value)
      }
      className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
    >
      {LIQUID_PRESETS.map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
    </select>
  )
}
