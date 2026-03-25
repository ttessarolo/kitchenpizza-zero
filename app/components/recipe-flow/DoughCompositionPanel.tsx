import { useState } from 'react'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { calcYeastPct } from '@commons/utils/yeast-calculator'
import { getDoughWarnings, type RecipeWarning } from '@commons/utils/warning-manager'
import { rnd } from '@commons/utils/recipe'
import { YEAST_TYPES } from '@/local_data'
import { WarningCard } from './WarningCard'
import type { NodeData } from '@commons/types/recipe-graph'

// ── Shared slider component ────────────────────────────────────

function SliderRow({
  icon, label, value, min, max, step, unit, suggestion, onChange,
}: {
  icon: string; label: string; value: number; min: number; max: number
  step: number; unit: string; suggestion?: string; onChange: (v: number) => void
}) {
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-muted-foreground font-medium">{icon} {label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number" value={value} min={min} max={max} step={step}
            onChange={(e) => onChange(+e.target.value || 0)}
            className="w-[60px] text-xs font-bold bg-white border border-border rounded px-1.5 py-0.5 outline-none text-center min-h-7"
          />
          <span className="text-muted-foreground text-[10px]">{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)} className="w-full accent-primary" />
      {suggestion && <div className="text-[10px] text-muted-foreground mt-0.5 italic">{suggestion}</div>}
    </div>
  )
}

// ── Tab content: reads/writes from a specific dough node ────────

function DoughTabContent({ nodeId, onRemove }: { nodeId: string; onRemove?: () => void }) {
  const graph = useRecipeFlowStore((s) => s.graph)
  const meta = useRecipeFlowStore((s) => s.meta)
  const updateNodeData = useRecipeFlowStore((s) => s.updateNodeData)
  const updateNodeCosmetic = useRecipeFlowStore((s) => s.updateNodeCosmetic)
  const [doughHoursLocal, setDoughHoursLocal] = useState<number | null>(null)

  const node = graph.nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const d = node.data

  // Sum ingredients from the dough node AND all its upstream ancestors
  // (pre_ferment, pre_dough nodes that feed into this dough)
  const ancestorIds = new Set<string>()
  const queue = graph.edges.filter((e) => e.target === nodeId).map((e) => e.source)
  while (queue.length) {
    const id = queue.shift()!
    if (ancestorIds.has(id)) continue
    const n = graph.nodes.find((x) => x.id === id)
    if (!n) continue
    // Only include pre_ferment, pre_dough, and rise nodes that are part of this dough's chain
    if (n.type === 'pre_ferment' || n.type === 'pre_dough' || n.type === 'rise') {
      ancestorIds.add(id)
      graph.edges.filter((e) => e.target === id).forEach((e) => queue.push(e.source))
    }
  }

  const chainNodes = [node, ...graph.nodes.filter((n) => ancestorIds.has(n.id))]
  const totalFlour = chainNodes.reduce((a, n) => a + n.data.flours.reduce((s, f) => s + f.g, 0), 0)
  const totalLiquid = chainNodes.reduce((a, n) => a + n.data.liquids.reduce((s, l) => s + l.g, 0), 0)
  // Yeast: sum as-is AND compute fresh-equivalent grams for display/calculation
  const yeastG = chainNodes.reduce((a, n) => a + (n.data.yeasts ?? []).reduce((s, y) => s + y.g, 0), 0)
  const yeastFreshEquivG = chainNodes.reduce((a, n) => {
    return a + (n.data.yeasts ?? []).reduce((s, y) => {
      const yt = YEAST_TYPES.find((t) => t.key === y.type)
      const toFresh = yt?.toFresh ?? 1
      return s + y.g * toFresh
    }, 0)
  }, 0)
  const saltG = chainNodes.reduce((a, n) => a + (n.data.salts ?? []).reduce((s, x) => s + x.g, 0), 0)
  const fatG = chainNodes.reduce((a, n) => a + (n.data.fats ?? []).reduce((s, x) => s + x.g, 0), 0)

  // Yeast % is ALWAYS calculated on fresh-equivalent (reference: birra fresco)
  const yeastPct = totalFlour > 0 ? Math.round(yeastFreshEquivG / totalFlour * 10000) / 100 : 0
  const saltPct = totalFlour > 0 ? Math.round(saltG / totalFlour * 1000) / 10 : 0
  const fatPct = totalFlour > 0 ? Math.round(fatG / totalFlour * 1000) / 10 : 0
  const hyd = totalFlour > 0 ? Math.round(totalLiquid / totalFlour * 100) : 0

  // Hours: use local state for smooth slider, fallback to estimate from yeast
  const estFromYeast = yeastPct > 0 ? Math.max(1, Math.min(96, Math.round(100000 / (hyd * 576 * yeastPct)))) : 18
  const doughHours = doughHoursLocal ?? estFromYeast
  const suggestedYeast = calcYeastPct(doughHours, hyd || 60)

  // pct is ALWAYS fresh-equivalent. Convert to the node's actual yeast type.
  function setYeastPct(pct: number) {
    if (totalFlour <= 0) return
    const freshG = rnd(totalFlour * pct / 100) // grams of fresh yeast
    const yeastType = (d.yeasts ?? [])[0]?.type || 'fresh'
    const yt = YEAST_TYPES.find((t) => t.key === yeastType)
    const toFresh = yt?.toFresh ?? 1
    const actualG = rnd(freshG / toFresh) // convert fresh → actual type
    updateNodeData(nodeId, { yeasts: [{ id: 0, type: yeastType, g: actualG }] })
  }

  function setSaltPct(pct: number) {
    if (totalFlour <= 0) return
    const g = rnd(totalFlour * pct / 100)
    const saltType = (d.salts ?? [])[0]?.type || 'sale_fino'
    updateNodeData(nodeId, { salts: [{ id: 0, type: saltType, g }] })
  }

  function setFatPct(pct: number) {
    if (totalFlour <= 0) return
    const g = rnd(totalFlour * pct / 100)
    const fatType = (d.fats ?? [])[0]?.type || 'olio_evo'
    updateNodeData(nodeId, { fats: [{ id: 0, type: fatType, g }] })
  }

  const warnings = getDoughWarnings({
    doughHours: doughHours,
    yeastPct,
    saltPct,
    fatPct,
    hydration: hyd,
    recipeType: meta.type,
    recipeSubtype: meta.subtype,
  })

  // Scale ALL chain nodes proportionally when total flour changes
  function setFlourG(newTotal: number) {
    if (newTotal <= 0 || totalFlour <= 0) return
    const ratio = newTotal / totalFlour
    // Update each node in the chain
    for (const cn of chainNodes) {
      if (cn.data.flours.length === 0 && cn.data.liquids.length === 0) continue
      updateNodeData(cn.id, {
        flours: cn.data.flours.map((f) => ({ ...f, g: rnd(f.g * ratio) })),
        liquids: cn.data.liquids.map((l) => ({ ...l, g: rnd(l.g * ratio) })),
        yeasts: (cn.data.yeasts ?? []).map((y) => ({ ...y, g: rnd(y.g * ratio) })),
        salts: (cn.data.salts ?? []).map((s) => ({ ...s, g: rnd(s.g * ratio) })),
        fats: (cn.data.fats ?? []).map((f) => ({ ...f, g: rnd(f.g * ratio) })),
      })
    }
  }

  // Set hydration: adjust liquids + recalculate yeast (Formula L depends on hydration)
  function setHydration(newHyd: number) {
    if (totalFlour <= 0 || newHyd <= 0) return
    const targetLiquid = rnd(totalFlour * newHyd / 100)

    // Update liquids
    if (totalLiquid <= 0) {
      const liquidType = d.liquids[0]?.type || 'Acqua'
      updateNodeData(nodeId, { liquids: [{ id: 0, type: liquidType, g: targetLiquid, temp: null }] })
    } else {
      const ratio = targetLiquid / totalLiquid
      for (const cn of chainNodes) {
        if (cn.data.liquids.length === 0) continue
        updateNodeData(cn.id, {
          liquids: cn.data.liquids.map((l) => ({ ...l, g: rnd(l.g * ratio) })),
        })
      }
    }

    // Recalculate yeast from Formula L (hydration changed → yeast amount changes)
    const newYeastPct = calcYeastPct(doughHours, newHyd) // fresh-equivalent %
    if (newYeastPct > 0 && totalFlour > 0) {
      const freshG = rnd(totalFlour * newYeastPct / 100)
      const yeastType = (d.yeasts ?? [])[0]?.type || 'fresh'
      const yt = YEAST_TYPES.find((t) => t.key === yeastType)
      const toFresh = yt?.toFresh ?? 1
      const actualG = rnd(freshG / toFresh)
      updateNodeData(nodeId, { yeasts: [{ id: 0, type: yeastType, g: actualG }] })
    }
  }

  return (
    <div>
      {/* Name — cosmetic, no reconciliation */}
      <div className="mb-2">
        <input
          type="text" value={d.title}
          onChange={(e) => updateNodeCosmetic(nodeId, { title: e.target.value })}
          placeholder="Nome impasto"
          className="w-full text-sm font-semibold border-b border-dashed border-border outline-none pb-1 bg-transparent"
        />
      </div>

      {/* Flour quantity + Hydration — editable */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Farine (g)</label>
          <input type="number" value={Math.round(totalFlour * 10) / 10} min={10} step={1}
            onChange={(e) => setFlourG(+e.target.value || 10)}
            className="w-full text-xs font-bold bg-white border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Idratazione (%)</label>
          <input type="number" value={hyd} min={30} max={100} step={1}
            onChange={(e) => setHydration(+e.target.value || 60)}
            className="w-full text-xs font-bold bg-white border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none" />
        </div>
      </div>

      {/* Computed summary */}
      <div className="text-[10px] text-muted-foreground mb-2">
        Liquidi: {Math.round(totalLiquid * 10) / 10}g · Totale: {Math.round((totalFlour + totalLiquid + yeastG + saltG + fatG) * 10) / 10}g
      </div>

      {/* Duration — influences yeast calculation */}
      <SliderRow icon="⏱" label="Durata lievitazione" value={doughHours} min={1} max={96} step={1} unit="ore"
        onChange={(v) => {
          const hours = Math.round(v)
          setDoughHoursLocal(hours)
          // Inverse Formula L: change hours → recalculate yeast
          const newYeastPct = calcYeastPct(hours, hyd || 60)
          setYeastPct(Math.round(newYeastPct * 100) / 100)
        }} />

      <SliderRow icon="🍞" label="Lievito" value={yeastPct} min={0} max={3.5} step={0.01} unit="%"
        suggestion={`${Math.round(yeastFreshEquivG * 10) / 10}g birra fresco · ~${doughHours}h di lievitazione`}
        onChange={setYeastPct} />

      <SliderRow icon="🧂" label="Sale" value={saltPct} min={0} max={4} step={0.1} unit="%"
        onChange={setSaltPct} />

      <SliderRow icon="🫒" label="Grassi" value={fatPct} min={0} max={25} step={0.5} unit="%"
        onChange={setFatPct} />

      {warnings.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {warnings.map((w) => (
            <WarningCard key={w.id} warning={w as any} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Global settings (for empty graphs — pre-generation) ─────────

function GlobalCompositionSettings() {
  const portioning = useRecipeFlowStore((s) => s.portioning)
  const meta = useRecipeFlowStore((s) => s.meta)
  const setPortioning = useRecipeFlowStore((s) => s.setPortioning)

  const { doughHours, yeastPct, saltPct, fatPct, targetHyd, preImpasto, preFermento } = portioning
  const suggestedYeast = calcYeastPct(doughHours, targetHyd || 60)

  function update(patch: Partial<typeof portioning>) {
    setPortioning((p) => ({ ...p, ...patch }))
  }

  const warnings = getDoughWarnings({
    doughHours, yeastPct, saltPct, fatPct,
    hydration: targetHyd, recipeType: meta.type, recipeSubtype: meta.subtype,
  })

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pre-Impasto</label>
          <select value={preImpasto || ''} onChange={(e) => update({ preImpasto: e.target.value || null })}
            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none">
            <option value="">No</option>
            <option value="tangzhong">Tangzhong</option>
            <option value="autolisi">Autolisi</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pre-Fermento</label>
          <select value={preFermento || ''} onChange={(e) => update({ preFermento: e.target.value || null })}
            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none">
            <option value="">No</option>
            <option value="biga">Biga</option>
            <option value="poolish">Poolish</option>
            <option value="sponge">Sponge</option>
            <option value="idrobiga">Idrobiga</option>
            <option value="sourdough">Lievito Madre</option>
            <option value="old_dough">Pasta di Riporto</option>
          </select>
        </div>
      </div>

      <SliderRow icon="⏱" label="Durata impasto" value={doughHours} min={1} max={98} step={1} unit="ore"
        onChange={(v) => {
          const newYeast = calcYeastPct(v, targetHyd || 60)
          update({ doughHours: v, yeastPct: Math.round(newYeast * 1000) / 1000 })
        }} />
      <SliderRow icon="🍞" label="Lievito" value={Math.round(yeastPct * 100) / 100} min={0} max={3.5} step={0.01} unit="%"
        suggestion={`Suggerito: ${rnd(suggestedYeast)}% per ${doughHours}h`}
        onChange={(v) => update({ yeastPct: v })} />
      <SliderRow icon="🧂" label="Sale" value={Math.round(saltPct * 10) / 10} min={0} max={4} step={0.1} unit="%"
        onChange={(v) => update({ saltPct: v })} />
      <SliderRow icon="🫒" label="Grassi" value={Math.round(fatPct * 10) / 10} min={0} max={25} step={0.5} unit="%"
        onChange={(v) => update({ fatPct: v })} />

      {warnings.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {warnings.map((w) => (
            <WarningCard key={w.id} warning={w as any} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main panel: multi-tab or global ─────────────────────────────

export function DoughCompositionPanel() {
  const graph = useRecipeFlowStore((s) => s.graph)
  const addRootNode = useRecipeFlowStore((s) => s.addRootNode)
  const removeNode = useRecipeFlowStore((s) => s.removeNode)
  const doughNodes = graph.nodes.filter((n) => n.type === 'dough')

  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  // If no dough nodes exist → show global settings for generation
  if (doughNodes.length === 0) {
    return <GlobalCompositionSettings />
  }

  // Auto-select first tab if none selected
  const activeId = activeTabId && doughNodes.some((n) => n.id === activeTabId)
    ? activeTabId
    : doughNodes[0].id

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-border mb-2 overflow-x-auto">
        {doughNodes.map((d) => (
          <div key={d.id} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTabId(d.id)}
              className={`text-[11px] px-2.5 py-1.5 border-b-2 transition-colors ${
                d.id === activeId
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {d.data.title || 'Impasto'}
            </button>
            {doughNodes.length > 1 && (
              <button
                type="button"
                onClick={() => setConfirmRemoveId(d.id)}
                className="text-[9px] text-red-400 hover:text-red-600 px-0.5"
                title="Rimuovi impasto"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {doughNodes.length < 4 && (
          <button
            type="button"
            onClick={() => addRootNode('dough')}
            className="text-[11px] px-2 py-1.5 text-primary hover:bg-primary/5 rounded shrink-0"
            title="Aggiungi impasto"
          >
            +
          </button>
        )}
      </div>

      {/* Active tab content */}
      <DoughTabContent nodeId={activeId} />

      {/* Confirm remove dialog */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm mx-4">
            <div className="text-base font-bold text-foreground mb-2">Rimuovere questo impasto?</div>
            <p className="text-sm text-muted-foreground mb-4">
              L'impasto e tutti i nodi collegati (lievitazione, formatura, etc.) verranno eliminati dal grafo.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmRemoveId(null)}
                className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-[#faf8f5]">
                Annulla
              </button>
              <button type="button" onClick={() => {
                removeNode(confirmRemoveId)
                setConfirmRemoveId(null)
                if (activeTabId === confirmRemoveId) setActiveTabId(null)
              }}
                className="text-sm font-bold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
