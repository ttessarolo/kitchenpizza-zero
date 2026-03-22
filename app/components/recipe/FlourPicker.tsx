import { useState, useRef, useEffect } from 'react'
import { FLOUR_CATALOG, FLOUR_GROUPS } from '@/local_data'
import { getFlour } from '@commons/utils/recipe'
import type { FlourCatalogEntry } from '@commons/types/recipe'

interface FlourPickerProps {
  value: string
  onChange: (key: string) => void
}

export function FlourPicker({ value, onChange }: FlourPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const cur = getFlour(value, FLOUR_CATALOG as unknown as FlourCatalogEntry[])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = search.trim()
    ? (FLOUR_CATALOG as unknown as FlourCatalogEntry[]).filter((f) =>
        (f.label + ' ' + f.sub + ' ' + f.group)
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : (FLOUR_CATALOG as unknown as FlourCatalogEntry[])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none min-h-8"
      >
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {cur.label}{' '}
          <span className="text-xs text-[#a08060]">{cur.sub}</span>
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border-[1.5px] border-[#d4c4b0] rounded-[10px] mt-1 shadow-lg max-h-[280px] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-[#f0e8df]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca farina..."
              autoFocus
              className="text-xs border border-border rounded-md px-2 py-1 w-full outline-none"
            />
          </div>
          <div className="overflow-y-auto max-h-[220px]">
            {FLOUR_GROUPS.map((g) => {
              const items = filtered.filter((f) => f.group === g)
              if (!items.length) return null
              return (
                <div key={g}>
                  <div className="text-[11px] font-bold text-[#b8845a] uppercase tracking-[1.5px] px-3 pt-2 pb-0.5 sticky top-0 bg-white">
                    {g}
                  </div>
                  {items.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        onChange(f.key)
                        setOpen(false)
                        setSearch('')
                      }}
                      className={`block w-full text-left px-3 py-1.5 border-none cursor-pointer text-xs text-foreground min-h-8 ${
                        f.key === value ? 'bg-[#fef6ed]' : 'bg-transparent hover:bg-[#faf6f1]'
                      }`}
                    >
                      {f.label}{' '}
                      <span className="text-xs text-[#a08060]">{f.sub}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1 mt-1">
        {[
          { l: 'Prot', v: cur.protein + '%', c: '#5a6070' },
          { l: 'W', v: String(cur.W || '—'), c: '#d4a54a' },
          { l: 'Ass.', v: cur.absorption + '%', c: '#5090c0' },
          { l: 'Cen.', v: cur.ash + '%', c: '#8a6e55' },
        ].map((it) => (
          <span
            key={it.l}
            className="text-[11px] bg-[#f5f2ee] rounded px-1.5 py-px"
            style={{ color: it.c }}
          >
            {it.l}: <b>{it.v}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
