import { useState } from 'react'
import { FAT_TYPES } from '@/local_data'
import { useT } from '~/hooks/useTranslation'

interface FatSelectorProps {
  value: string
  onChange: (v: string) => void
}

export function FatSelector({ value, onChange }: FatSelectorProps) {
  const t = useT()
  const [custom, setCustom] = useState(false)

  if (custom || !FAT_TYPES.some((s) => s.key === value)) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs font-normal text-foreground bg-card border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
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
      {FAT_TYPES.map((s) => (
        <option key={s.key} value={s.key}>
          {t(s.labelKey)}
        </option>
      ))}
      <option value="__custom__">Altro...</option>
    </select>
  )
}
