import { useState } from 'react'
import { cn } from '~/lib/utils'

interface MiniSelectOption {
  k: string
  l: string
}

interface MiniSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: MiniSelectOption[]
  onNew?: (name: string) => void
  className?: string
}

export function MiniSelect({ label, value, onChange, options, onNew, className }: MiniSelectProps) {
  const [adding, setAdding] = useState(false)
  const [newValue, setNewValue] = useState('')

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-[11px] text-[#b8a08a] font-medium">{label}:</span>
      {adding ? (
        <div className="flex gap-0.5">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="text-xs border border-border rounded px-1 py-0.5 w-[70px] outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (newValue.trim() && onNew) {
                onNew(newValue.trim())
                setAdding(false)
                setNewValue('')
              }
            }}
            className="text-[11px] bg-primary text-primary-foreground border-none rounded px-1.5 py-0.5 cursor-pointer"
          >
            OK
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) =>
            e.target.value === '__new__' ? setAdding(true) : onChange(e.target.value)
          }
          className="text-[11px] text-[#6a5a48] bg-[#f5f0ea] border border-border rounded px-1 py-0.5 cursor-pointer outline-none min-h-7"
        >
          {options.map((o) => (
            <option key={o.k} value={o.k}>
              {o.l}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
