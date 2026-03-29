import React, { useMemo } from 'react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { computePanoramica } from '@commons/utils/panoramica-manager'
import { staticProvider } from '@commons/utils/science/static-science-provider'
import type { RecipeLayer } from '@commons/types/recipe-layers'
import type { NodeData } from '@commons/types/recipe-graph'
import type { FlourIngredient, LiquidIngredient, ExtraIngredient, YeastIngredient, SaltIngredient, SugarIngredient, FatIngredient } from '@commons/types/recipe'

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

// ── Aggregate ingredients per layer ────────────────────────────

interface AggregatedIngredients {
  flours: FlourIngredient[]
  liquids: LiquidIngredient[]
  extras: ExtraIngredient[]
  yeasts: YeastIngredient[]
  salts: SaltIngredient[]
  sugars: SugarIngredient[]
  fats: FatIngredient[]
}

function aggregateLayerIngredients(layer: RecipeLayer): AggregatedIngredients {
  const result: AggregatedIngredients = {
    flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
  }
  for (const node of layer.nodes) {
    const d = node.data as NodeData
    for (const f of d.flours) {
      const existing = result.flours.find((x) => x.type === f.type)
      if (existing) existing.g += f.g
      else result.flours.push({ ...f })
    }
    for (const l of d.liquids) {
      const existing = result.liquids.find((x) => x.type === l.type)
      if (existing) existing.g += l.g
      else result.liquids.push({ ...l })
    }
    for (const e of d.extras) {
      const existing = result.extras.find((x) => x.name === e.name)
      if (existing) existing.g += e.g
      else result.extras.push({ ...e })
    }
    for (const y of d.yeasts) {
      const existing = result.yeasts.find((x) => x.type === y.type)
      if (existing) existing.g += y.g
      else result.yeasts.push({ ...y })
    }
    for (const s of d.salts) {
      const existing = result.salts.find((x) => x.type === s.type)
      if (existing) existing.g += s.g
      else result.salts.push({ ...s })
    }
    for (const s of d.sugars) {
      const existing = result.sugars.find((x) => x.type === s.type)
      if (existing) existing.g += s.g
      else result.sugars.push({ ...s })
    }
    for (const f of d.fats) {
      const existing = result.fats.find((x) => x.type === f.type)
      if (existing) existing.g += f.g
      else result.fats.push({ ...f })
    }
  }
  return result
}

function hasIngredients(agg: AggregatedIngredients): boolean {
  return (
    agg.flours.length > 0 ||
    agg.liquids.length > 0 ||
    agg.extras.length > 0 ||
    agg.yeasts.length > 0 ||
    agg.salts.length > 0 ||
    agg.sugars.length > 0 ||
    agg.fats.length > 0
  )
}

// ── Timeline building ──────────────────────────────────────────

interface TimelineEntry {
  layerId: string
  layerName: string
  layerColor: string
  nodeId: string
  nodeTitle: string
  duration: number
  topoLevel: number
  isCriticalPath: boolean
}

function buildTimeline(
  layers: RecipeLayer[],
  panoramica: ReturnType<typeof computePanoramica>,
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const layerSummary of panoramica.layers) {
    const layer = layers.find((l) => l.id === layerSummary.layerId)
    if (!layer || !layer.visible) continue

    const criticalSet = new Set(layerSummary.criticalPath)

    // Compute topological levels for this layer
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()
    for (const n of layer.nodes) {
      inDegree.set(n.id, 0)
      adj.set(n.id, [])
    }
    for (const e of layer.edges) {
      adj.get(e.source)?.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }

    const topoLevel = new Map<string, number>()
    const queue: string[] = []
    for (const [id, deg] of inDegree) {
      if (deg === 0) { queue.push(id); topoLevel.set(id, 0) }
    }

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentLevel = topoLevel.get(current) ?? 0
      for (const neighbor of adj.get(current) ?? []) {
        const newLevel = currentLevel + 1
        if (newLevel > (topoLevel.get(neighbor) ?? 0)) {
          topoLevel.set(neighbor, newLevel)
        }
        const newInDeg = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, newInDeg)
        if (newInDeg === 0) queue.push(neighbor)
      }
    }

    // Walk critical path in order
    for (const nodeId of layerSummary.criticalPath) {
      const node = layer.nodes.find((n) => n.id === nodeId)
      if (!node) continue
      entries.push({
        layerId: layer.id,
        layerName: layer.name,
        layerColor: layer.color,
        nodeId: node.id,
        nodeTitle: node.data.title || nodeId,
        duration: (node.data as NodeData).baseDur + (node.data as NodeData).restDur,
        topoLevel: topoLevel.get(nodeId) ?? 0,
        isCriticalPath: criticalSet.has(nodeId),
      })
    }

    // Add non-critical nodes (for completeness)
    for (const node of layer.nodes) {
      if (criticalSet.has(node.id)) continue
      entries.push({
        layerId: layer.id,
        layerName: layer.name,
        layerColor: layer.color,
        nodeId: node.id,
        nodeTitle: node.data.title || node.id,
        duration: (node.data as NodeData).baseDur + (node.data as NodeData).restDur,
        topoLevel: topoLevel.get(node.id) ?? 0,
        isCriticalPath: false,
      })
    }
  }

  // Sort by topological level, then by layer position
  entries.sort((a, b) => a.topoLevel - b.topoLevel || a.layerId.localeCompare(b.layerId))

  return entries
}

// ── Component ──────────────────────────────────────────────────

export function PanoramicaSummaryPanel() {
  const t = useT()
  const layers = useRecipeFlowStore((s) => s.layers)
  const crossEdges = useRecipeFlowStore((s) => s.crossEdges)

  const result = useMemo(() => {
    if (layers.length === 0) return null
    try { return computePanoramica(staticProvider, layers, crossEdges) }
    catch { return null }
  }, [layers, crossEdges])

  const ingredientsByLayer = useMemo(() => {
    const map = new Map<string, AggregatedIngredients>()
    for (const layer of layers) {
      if (!layer.visible) continue
      const agg = aggregateLayerIngredients(layer)
      if (hasIngredients(agg)) map.set(layer.id, agg)
    }
    return map
  }, [layers])

  const totalIngredients = useMemo(() => {
    const total: AggregatedIngredients = {
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
    }
    for (const agg of ingredientsByLayer.values()) {
      for (const f of agg.flours) {
        const existing = total.flours.find((x) => x.type === f.type)
        if (existing) existing.g += f.g
        else total.flours.push({ ...f })
      }
      for (const l of agg.liquids) {
        const existing = total.liquids.find((x) => x.type === l.type)
        if (existing) existing.g += l.g
        else total.liquids.push({ ...l })
      }
      for (const e of agg.extras) {
        const existing = total.extras.find((x) => x.name === e.name)
        if (existing) existing.g += e.g
        else total.extras.push({ ...e })
      }
      for (const y of agg.yeasts) {
        const existing = total.yeasts.find((x) => x.type === y.type)
        if (existing) existing.g += y.g
        else total.yeasts.push({ ...y })
      }
      for (const s of agg.salts) {
        const existing = total.salts.find((x) => x.type === s.type)
        if (existing) existing.g += s.g
        else total.salts.push({ ...s })
      }
      for (const s of agg.sugars) {
        const existing = total.sugars.find((x) => x.type === s.type)
        if (existing) existing.g += s.g
        else total.sugars.push({ ...s })
      }
      for (const f of agg.fats) {
        const existing = total.fats.find((x) => x.type === f.type)
        if (existing) existing.g += f.g
        else total.fats.push({ ...f })
      }
    }
    return total
  }, [ingredientsByLayer])

  const timeline = useMemo(() => {
    if (!result) return []
    return buildTimeline(layers, result)
  }, [layers, result])

  if (!result) {
    return <div className="p-3 text-xs text-muted-foreground">{t('panoramica_title')}</div>
  }

  return (
    <div className="flex-1 overflow-y-auto text-xs">
      {/* Total Duration */}
      <div className="p-3 border-b border-border">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {t('panoramica_total_duration')}
        </div>
        <div className="text-xl font-bold text-primary">{formatDuration(result.totalDuration)}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {result.layers.length} {t('layers')} &middot; {result.layers.reduce((a, l) => a + l.nodeCount, 0)} {t('nodes')}
        </div>
      </div>

      {/* Ingredienti */}
      {ingredientsByLayer.size > 0 && (
        <div className="p-3 border-b border-border">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('panoramica_ingredients')}
          </div>

          {/* Total aggregated ingredients */}
          {hasIngredients(totalIngredients) && (
            <div className="space-y-0.5 text-muted-foreground mb-3">
              {totalIngredients.flours.map((f) => (
                <div key={`total-flour-${f.type}`} className="flex justify-between">
                  <span className="truncate">{f.type}</span>
                  <span className="font-mono tabular-nums ml-2">{Math.round(f.g)}g</span>
                </div>
              ))}
              {totalIngredients.liquids.map((l) => (
                <div key={`total-liquid-${l.type}`} className="flex justify-between">
                  <span className="truncate">{l.type}</span>
                  <span className="font-mono tabular-nums ml-2">{Math.round(l.g)}g</span>
                </div>
              ))}
              {totalIngredients.salts.map((s) => (
                <div key={`total-salt-${s.type}`} className="flex justify-between">
                  <span className="truncate">{s.type}</span>
                  <span className="font-mono tabular-nums ml-2">{Math.round(s.g)}g</span>
                </div>
              ))}
              {totalIngredients.sugars.map((s) => (
                <div key={`total-sugar-${s.type}`} className="flex justify-between">
                  <span className="truncate">{s.type}</span>
                  <span className="font-mono tabular-nums ml-2">{Math.round(s.g)}g</span>
                </div>
              ))}
              {totalIngredients.fats.map((f) => (
                <div key={`total-fat-${f.type}`} className="flex justify-between">
                  <span className="truncate">{f.type}</span>
                  <span className="font-mono tabular-nums ml-2">{Math.round(f.g)}g</span>
                </div>
              ))}
              {totalIngredients.yeasts.map((y) => (
                <div key={`total-yeast-${y.type}`} className="flex justify-between">
                  <span className="truncate">{y.type}</span>
                  <span className="font-mono tabular-nums ml-2">{Math.round(y.g * 100) / 100}g</span>
                </div>
              ))}
              {totalIngredients.extras.map((e) => (
                <div key={`total-extra-${e.name}`} className="flex justify-between">
                  <span className="truncate">{e.name}</span>
                  <span className="font-mono tabular-nums ml-2">{Math.round(e.g)}g</span>
                </div>
              ))}
            </div>
          )}

          {/* Per-layer ingredient breakdown (collapsible) */}
          <details className="text-muted-foreground">
            <summary className="text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors">
              {t('panoramica_ingredients_per_layer')}
            </summary>
            <div className="space-y-3 mt-2">
              {layers.filter((l) => l.visible && ingredientsByLayer.has(l.id)).map((layer) => {
                const agg = ingredientsByLayer.get(layer.id)!
                return (
                  <div key={layer.id}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="font-semibold truncate text-foreground">{layer.name}</span>
                    </div>
                    <div className="ml-3.5 space-y-0.5">
                      {agg.flours.map((f) => (
                        <div key={`flour-${f.type}`} className="flex justify-between">
                          <span className="truncate">{f.type}</span>
                          <span className="font-mono tabular-nums ml-2">{Math.round(f.g)}g</span>
                        </div>
                      ))}
                      {agg.liquids.map((l) => (
                        <div key={`liquid-${l.type}`} className="flex justify-between">
                          <span className="truncate">{l.type}</span>
                          <span className="font-mono tabular-nums ml-2">{Math.round(l.g)}g</span>
                        </div>
                      ))}
                      {agg.salts.map((s) => (
                        <div key={`salt-${s.type}`} className="flex justify-between">
                          <span className="truncate">{s.type}</span>
                          <span className="font-mono tabular-nums ml-2">{Math.round(s.g)}g</span>
                        </div>
                      ))}
                      {agg.sugars.map((s) => (
                        <div key={`sugar-${s.type}`} className="flex justify-between">
                          <span className="truncate">{s.type}</span>
                          <span className="font-mono tabular-nums ml-2">{Math.round(s.g)}g</span>
                        </div>
                      ))}
                      {agg.fats.map((f) => (
                        <div key={`fat-${f.type}`} className="flex justify-between">
                          <span className="truncate">{f.type}</span>
                          <span className="font-mono tabular-nums ml-2">{Math.round(f.g)}g</span>
                        </div>
                      ))}
                      {agg.yeasts.map((y) => (
                        <div key={`yeast-${y.type}`} className="flex justify-between">
                          <span className="truncate">{y.type}</span>
                          <span className="font-mono tabular-nums ml-2">{Math.round(y.g * 100) / 100}g</span>
                        </div>
                      ))}
                      {agg.extras.map((e) => (
                        <div key={`extra-${e.name}`} className="flex justify-between">
                          <span className="truncate">{e.name}</span>
                          <span className="font-mono tabular-nums ml-2">{Math.round(e.g)}g</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      )}

      {/* Cronogramma (Timeline) */}
      {timeline.length > 0 && (
        <div className="p-3 border-b border-border">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('panoramica_cronogramma')}
          </div>
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />

            <div className="space-y-1">
              {(() => {
                let cumulativeMinutes = 0
                let currentDay = 0
                const elements: React.ReactNode[] = []

                // Insert initial day separator
                elements.push(
                  <div key="day-0" className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-muted-foreground/30" />
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Oggi</span>
                    <div className="flex-1 h-px bg-muted-foreground/30" />
                  </div>
                )

                for (let idx = 0; idx < timeline.length; idx++) {
                  const entry = timeline[idx]

                  // Check if cumulative duration crosses a new day boundary
                  const newDay = Math.floor(cumulativeMinutes / 1440)
                  if (newDay > currentDay) {
                    currentDay = newDay
                    const dayLabel = newDay === 1 ? 'Domani' : `+${newDay}gg`
                    elements.push(
                      <div key={`day-${newDay}`} className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-muted-foreground/30" />
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1">{dayLabel}</span>
                        <div className="flex-1 h-px bg-muted-foreground/30" />
                      </div>
                    )
                  }

                  const isParallel =
                    idx > 0 &&
                    timeline[idx - 1].topoLevel === entry.topoLevel &&
                    timeline[idx - 1].layerId !== entry.layerId

                  elements.push(
                    <div
                      key={`${entry.layerId}:${entry.nodeId}`}
                      className={`flex items-center gap-2 pl-3 relative ${
                        entry.isCriticalPath ? 'font-bold' : ''
                      }`}
                    >
                      {/* Timeline dot */}
                      <span
                        className={`absolute left-0 w-[11px] h-[11px] rounded-full border-2 border-white flex-shrink-0 ${
                          entry.isCriticalPath ? 'ring-1 ring-red-400' : ''
                        }`}
                        style={{ backgroundColor: entry.layerColor }}
                      />

                      {/* Parallel indicator */}
                      {isParallel && (
                        <span className="text-[9px] text-violet-500 font-medium mr-0.5">{'\u2225'}</span>
                      )}

                      <span
                        className={`flex-1 truncate ${
                          entry.isCriticalPath ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                        style={entry.isCriticalPath ? { borderLeft: '2px solid #ef4444', paddingLeft: 4 } : undefined}
                      >
                        {entry.nodeTitle}
                      </span>

                      {entry.duration > 0 && (
                        <span className="text-muted-foreground font-mono tabular-nums text-[10px] flex-shrink-0">
                          {formatDuration(entry.duration)}
                        </span>
                      )}
                    </div>
                  )

                  // Accumulate duration only for critical path entries (they define the timeline progression)
                  if (entry.isCriticalPath) {
                    cumulativeMinutes += entry.duration
                  }
                }

                return elements
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Cross-layer dependencies (compact) */}
      {result.crossDependencies.length > 0 && (
        <div className="p-3">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t('panoramica_dependencies')}
          </div>
          <div className="space-y-0.5">
            {result.crossDependencies.map((dep) => {
              const srcLayer = layers.find((l) => l.id === dep.sourceLayerId)
              const tgtLayer = layers.find((l) => l.id === dep.targetLayerId)
              return (
                <div key={dep.edgeId} className="flex items-center gap-1 text-muted-foreground">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: srcLayer?.color ?? '#888' }}
                  />
                  <span className="truncate text-[10px]">{srcLayer?.name ?? dep.sourceLayerId}</span>
                  <span className="text-[9px]">&rarr;</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tgtLayer?.color ?? '#888' }}
                  />
                  <span className="truncate text-[10px]">{tgtLayer?.name ?? dep.targetLayerId}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
