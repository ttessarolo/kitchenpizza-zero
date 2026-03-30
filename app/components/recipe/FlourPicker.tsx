import { useState, useRef, useEffect } from 'react'
import { FLOUR_CATALOG, FLOUR_GROUPS } from '@/local_data'
import { getFlour, estimateW } from '@commons/utils/flour-manager'
import type { FlourCatalogEntry } from '@commons/types/recipe'
import { useT } from '~/hooks/useTranslation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

interface FlourPickerProps {
  value: string
  onChange: (key: string) => void
  customFlours?: FlourCatalogEntry[]
  onAddCustomFlour?: (flour: FlourCatalogEntry) => void
  /** When provided and non-empty, only show these flour keys from the catalog. */
  allowedKeys?: string[]
}

export function FlourPicker({ value, onChange, customFlours = [], onAddCustomFlour, allowedKeys }: FlourPickerProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const baseCatalog = allowedKeys && allowedKeys.length > 0
    ? (FLOUR_CATALOG as unknown as FlourCatalogEntry[]).filter((f) => allowedKeys.includes(f.key))
    : (FLOUR_CATALOG as unknown as FlourCatalogEntry[])
  const allFlours = [...baseCatalog, ...customFlours]
  const cur = customFlours.find((f) => f.key === value) || getFlour(value, FLOUR_CATALOG as unknown as FlourCatalogEntry[])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = search.trim()
    ? allFlours.filter((f) =>
        (t(f.labelKey) + ' ' + t(f.subKey) + ' ' + t(f.groupKey))
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : allFlours

  const allGroups = [...FLOUR_GROUPS, ...(customFlours.length > 0 ? ['flour_group_custom'] : [])]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none min-h-8"
      >
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {t(cur.labelKey)}{' '}
          <span className="text-xs text-muted-foreground">{t(cur.subKey)}</span>
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border-[1.5px] border-border rounded-[10px] mt-1 shadow-lg max-h-[280px] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca farina..."
              autoFocus
              className="text-xs border border-border rounded-md px-2 py-1 w-full outline-none"
            />
          </div>
          <div className="overflow-y-auto max-h-[220px]">
            {allGroups.map((g) => {
              const items = filtered.filter((f) => g === 'flour_group_custom' ? customFlours.some((cf) => cf.key === f.key) : f.groupKey === g)
              if (!items.length) return null
              return (
                <div key={g}>
                  <div className="text-[9px] font-bold text-accent uppercase tracking-[1.5px] px-3 pt-2 pb-0.5 sticky top-0 bg-card">
                    {t(g)}
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
                        f.key === value ? 'bg-muted' : 'bg-transparent hover:bg-muted'
                      }`}
                    >
                      {t(f.labelKey)}{' '}
                      <span className="text-xs text-muted-foreground">{t(f.subKey)}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
          {/* Create custom flour button */}
          {onAddCustomFlour && (
            <div className="p-2 border-t border-border">
              <button
                type="button"
                onClick={() => { setOpen(false); setCreateOpen(true) }}
                className="w-full text-xs font-semibold text-primary bg-transparent border border-dashed border-primary rounded-md px-2 py-1.5 cursor-pointer"
              >
                + Crea farina personalizzata
              </button>
            </div>
          )}
        </div>
      )}

      {/* Properties display — 2 rows */}
      <div className="flex flex-wrap gap-1 mt-1">
        {[
          { l: 'Prot', v: cur.protein + '%', c: 'hsl(var(--primary))' },
          { l: 'W', v: String(cur.W || '—'), c: 'hsl(var(--accent))' },
          { l: 'P/L', v: String(cur.PL || '—'), c: 'hsl(280 55% 60%)' },
          { l: 'Ass.', v: cur.absorption + '%', c: 'hsl(210 65% 55%)' },
          { l: 'Cen.', v: cur.ash + '%', c: 'hsl(var(--muted-foreground))' },
          { l: 'Fibra', v: cur.fiber + '%', c: 'hsl(150 50% 40%)' },
          { l: 'FN', v: String(cur.fallingNumber ?? '—'), c: 'hsl(20 65% 50%)' },
          { l: 'Vel.', v: String(cur.fermentSpeed), c: 'hsl(var(--muted-foreground))' },
        ].map((it) => (
          <span
            key={it.l}
            className="text-[9px] bg-muted rounded px-1.5 py-px"
            style={{ color: it.c }}
          >
            {it.l}: <b>{it.v}</b>
          </span>
        ))}
      </div>

      {/* Create flour dialog */}
      {onAddCustomFlour && (
        <CreateFlourDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSave={(flour) => {
            onAddCustomFlour(flour)
            onChange(flour.key)
            setCreateOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ── Create Flour Dialog ──────────────────────────────────────────
function CreateFlourDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (flour: FlourCatalogEntry) => void
}) {
  const t = useT()
  const [label, setLabel] = useState('')
  const [group, setGroup] = useState('flour_group_grano_tenero')
  const [protein, setProtein] = useState(12)
  const [W, setW] = useState<number | null>(null)
  const [PL, setPL] = useState(0.55)
  const [absorption, setAbsorption] = useState(60)
  const [ash, setAsh] = useState(0.55)
  const [fiber, setFiber] = useState(2.5)
  const [starchDamage] = useState(7)
  const [fermentSpeed, setFermentSpeed] = useState(1)
  const [fallingNumber, setFallingNumber] = useState(300)

  const computedW = W ?? estimateW(protein)
  const canSave = label.trim().length > 0

  function handleSave() {
    if (!canSave) return
    const key = `custom_${Date.now().toString(36)}`
    onSave({
      key,
      groupKey: group,
      labelKey: label.trim(),
      subKey: `W ${computedW} (custom)`,
      protein,
      W: computedW,
      PL,
      absorption,
      ash,
      fiber,
      starchDamage,
      fermentSpeed,
      fallingNumber,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crea farina personalizzata</DialogTitle>
          <DialogDescription>
            Specifica almeno il nome e W o Proteine.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 my-2 text-xs">
          {/* Name */}
          <div>
            <label className="font-semibold text-muted-foreground">Nome *</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Es. Farina Mix casa" className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" />
          </div>
          {/* Group */}
          <div>
            <label className="font-semibold text-muted-foreground">Gruppo</label>
            <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8">
              {FLOUR_GROUPS.map((g) => <option key={g} value={g}>{t(g)}</option>)}
            </select>
          </div>
          {/* W + Protein (linked) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-muted-foreground">W {W === null && `(stimato: ${computedW})`}</label>
              <input type="number" value={W ?? ''} placeholder={String(computedW)} onChange={(e) => setW(e.target.value ? +e.target.value : null)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground">Proteine %</label>
              <input type="number" step={0.1} value={protein} onChange={(e) => setProtein(+e.target.value || 10)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" />
            </div>
          </div>
          {/* Other fields */}
          <div className="grid grid-cols-3 gap-2">
            <div><label className="font-semibold text-muted-foreground">P/L</label><input type="number" step={0.05} value={PL} onChange={(e) => setPL(+e.target.value || 0.5)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" /></div>
            <div><label className="font-semibold text-muted-foreground">Ass. %</label><input type="number" value={absorption} onChange={(e) => setAbsorption(+e.target.value || 55)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" /></div>
            <div><label className="font-semibold text-muted-foreground">Ceneri %</label><input type="number" step={0.01} value={ash} onChange={(e) => setAsh(+e.target.value || 0.5)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="font-semibold text-muted-foreground">Fibra %</label><input type="number" step={0.1} value={fiber} onChange={(e) => setFiber(+e.target.value || 2)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" /></div>
            <div><label className="font-semibold text-muted-foreground">FN</label><input type="number" value={fallingNumber} onChange={(e) => setFallingNumber(+e.target.value || 300)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" /></div>
            <div><label className="font-semibold text-muted-foreground">Vel. ferm.</label><input type="number" step={0.05} value={fermentSpeed} onChange={(e) => setFermentSpeed(+e.target.value || 1)} className="w-full mt-0.5 border border-border rounded px-2 py-1 outline-none min-h-8" /></div>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-xs border border-border rounded-md bg-card cursor-pointer">Annulla</button>
          <button type="button" onClick={handleSave} disabled={!canSave} className="px-3 py-1.5 text-xs border-none rounded-md bg-primary text-primary-foreground cursor-pointer font-semibold disabled:opacity-40">Crea</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
