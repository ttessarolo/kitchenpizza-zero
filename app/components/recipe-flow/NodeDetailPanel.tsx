import { useMemo, useState, useEffect } from 'react'
import { useT } from '~/hooks/useTranslation'
import { stepColor } from '~/lib/theme-colors'
import { useRecipeFlowStore, selectGraph, selectPortioning } from '~/stores/recipe-flow-store'
import { nodeToStep, stepToNodeData, graphToRecipeV1 } from '@commons/utils/graph-adapter'
import { celsiusToFahrenheit } from '@commons/utils/format'
import { computeGraphTotals } from '~/hooks/useGraphCalculator'
import { getNodeDuration } from '~/hooks/useGraphCalculator'
import { RecipeProvider } from '~/components/recipe/RecipeContext'
import { StepBody } from '~/components/recipe/StepBody'
import { SplitConfigPanel } from './SplitConfigPanel'
import { JoinConfigPanel } from './JoinConfigPanel'
import { NodeStylePanel } from './NodeStylePanel'
import { COLOR_MAP, STEP_TYPES, KNEAD_METHODS } from '@/local_data'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { fmtDuration } from '@commons/utils/format'
import { LAYER_TYPE_META } from '@commons/constants/layer-defaults'
import { getSubtypeLabelKey } from '@commons/constants/layer-subtypes'
import { calcFinalDoughTempRPC } from '~/lib/recipe-rpc'
import { WarningCard } from './WarningCard'
import { ActionableWarningBox } from './ActionableWarningBox'
import { deduplicateWarnings } from '@commons/utils/warning-dedup'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import type { RecipeCalculator } from '~/hooks/useRecipeCalculator'
import type { RecipeStep, Recipe } from '@commons/types/recipe'

// ── Single panel for one node ───────────────────────────────────

function SinglePanel({
  nodeId,
  isPeek,
  onClose,
}: {
  nodeId: string
  isPeek: boolean
  onClose: () => void
}) {
  const t = useT()
  const graph = useRecipeFlowStore(selectGraph)
  const meta = useRecipeFlowStore((s) => s.meta)
  const portioning = useRecipeFlowStore(selectPortioning)
  const ingredientGroups = useRecipeFlowStore((s) => s.ingredientGroups)
  const temperatureUnit = useRecipeFlowStore((s) => s.temperatureUnit)
  const ambientTemp = useRecipeFlowStore((s) => s.ambientTemp)
  const updateNodeData = useRecipeFlowStore((s) => s.updateNodeData)
  const updateNodeCosmetic = useRecipeFlowStore((s) => s.updateNodeCosmetic)
  const updateNodeWithReconcile = useRecipeFlowStore((s) => s.updateNodeWithReconcile)
  const setTemperatureUnit = useRecipeFlowStore((s) => s.setTemperatureUnit)
  const removeNode = useRecipeFlowStore((s) => s.removeNode)
  const storeAddDep = useRecipeFlowStore((s) => s.addDep)
  const storeRemoveDep = useRecipeFlowStore((s) => s.removeDep)
  const storeUpdateDep = useRecipeFlowStore((s) => s.updateDep)
  const layers = useRecipeFlowStore((s) => s.layers)
  const storeWarnings = useRecipeFlowStore((s) => s.warnings)

  // Cross-layer peek: nodeId may be namespaced "layerId:bareNodeId"
  const isCrossLayerPeek = nodeId.includes(':')
  const bareNodeId = isCrossLayerPeek ? nodeId.split(':').slice(1).join(':') : nodeId

  const nodeWarnings = storeWarnings.filter((w) => w.sourceNodeId === bareNodeId)

  // Resolve node: active layer (bare ID) or specific layer (namespaced ID)
  const node = useMemo(() => {
    if (isCrossLayerPeek) {
      const layerId = nodeId.split(':')[0]
      const layer = layers.find((l) => l.id === layerId)
      return layer?.nodes.find((n) => n.id === bareNodeId) ?? null
    }
    return graph.nodes.find((n) => n.id === nodeId) ?? null
  }, [nodeId, isCrossLayerPeek, bareNodeId, graph, layers])

  const recipe: Recipe = useMemo(
    () => graphToRecipeV1(graph, meta, portioning, ingredientGroups),
    [graph, meta, portioning, ingredientGroups],
  )

  const totals = useMemo(() => computeGraphTotals(graph), [graph])

  // FDT: compute asynchronously via RPC, outside useMemo
  const [fdt, setFdt] = useState(ambientTemp)
  const nodeFlourKey = node ? node.data.flours.map((f: any) => `${f.type}:${f.g}`).join(',') : ''
  const nodeLiquidKey = node ? node.data.liquids.map((l: any) => `${l.type}:${l.g}`).join(',') : ''
  useEffect(() => {
    if (!node || !node.data.flours.length) { setFdt(ambientTemp); return }
    const step = nodeToStep(node, graph.edges)
    const km = KNEAD_METHODS.find((m) => m.key === step.kneadMethod) || KNEAD_METHODS[0]
    let cancelled = false
    calcFinalDoughTempRPC(step.flours as any, step.liquids as any, ambientTemp, km.ff)
      .then((temp) => { if (!cancelled) setFdt(temp) })
      .catch(() => {})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeFlourKey, nodeLiquidKey, ambientTemp])

  const bridge: RecipeCalculator = useMemo(() => {
    const displayTemp = (c: number) => {
      if (temperatureUnit === 'F') return `${Math.round(celsiusToFahrenheit(c))} °F`
      return `${Math.round(c)} °C`
    }

    const getStepDuration = (s: RecipeStep) => {
      const n = graph.nodes.find((nd) => nd.id === s.id)
      if (!n) return s.baseDur + (s.restDur || 0)
      return getNodeDuration(n, meta.type, meta.subtype, portioning.thickness)
    }

    const getFDT = () => fdt

    // Uses reconciling update — triggers pre-ferment reconcile + scale propagation
    const updateStep = (id: string, fn: (s: RecipeStep) => RecipeStep) => {
      updateNodeWithReconcile(id, fn)
    }

    const updateStepField = (id: string, field: string, value: unknown) => {
      // sourcePrep sync: update both NodeData and edge
      if (field === 'sourcePrep') {
        updateNodeWithReconcile(id, (s) => {
          const newSourcePrep = (value as string) || null
          let newDeps = s.deps
          if (newSourcePrep) {
            newDeps = [
              ...s.deps.filter((d) => {
                const t = recipe.steps.find((x) => x.id === d.id)?.type
                return t !== 'dough' && t !== 'pre_dough'
              }),
              { id: newSourcePrep, wait: 1, grams: 1 },
            ]
          }
          return { ...s, sourcePrep: newSourcePrep, deps: newDeps }
        })
      } else {
        updateNodeWithReconcile(id, (s) => ({ ...s, [field]: value }))
      }
    }

    const setStepHydration = (stepId: string, h: number) => {
      updateNodeWithReconcile(stepId, (s) => {
        const sF = s.flours.reduce((a, f) => a + f.g, 0)
        const sL = s.liquids.reduce((a, l) => a + l.g, 0)
        if (sF <= 0 || sL <= 0) return s
        const factor = ((sF * h) / 100) / sL
        return { ...s, liquids: s.liquids.map((l) => ({ ...l, g: Math.round(l.g * factor) })) }
      })
    }

    const getValidParents = (stepId: string) => {
      return recipe.steps.filter((s) => s.id !== stepId)
    }

    const setRecipe = (fnOrVal: React.SetStateAction<Recipe>) => {
      const newRecipe = typeof fnOrVal === 'function' ? fnOrVal(recipe) : fnOrVal
      // Apply changes for each modified step
      for (const step of newRecipe.steps) {
        const oldStep = recipe.steps.find((s) => s.id === step.id)
        if (!oldStep) continue
        // Only update if changed
        if (JSON.stringify(step) !== JSON.stringify(oldStep)) {
          updateNodeData(step.id, stepToNodeData(step))
        }
      }
    }

    return {
      recipe,
      editMode: !isCrossLayerPeek,
      temperatureUnit,
      ambientTemp,
      displayTemp,
      getStepDuration,
      getFDT,
      updateStep,
      updateStepField,
      setStepHydration,
      setRecipe: setRecipe as any,
      setTemperatureUnit,
      getValidParents,
      totalDough: totals.totalDough,
      addDep: storeAddDep,
      removeDep: storeRemoveDep,
      updateDep: storeUpdateDep,
    } as RecipeCalculator
  }, [recipe, graph, meta, portioning, temperatureUnit, ambientTemp, totals, fdt, updateNodeData, setTemperatureUnit, storeAddDep, storeRemoveDep, storeUpdateDep])

  if (!node) return null

  // For cross-layer peek, use the edges from the node's own layer
  const nodeEdges = useMemo(() => {
    if (isCrossLayerPeek) {
      const layerId = nodeId.split(':')[0]
      const layer = layers.find((l) => l.id === layerId)
      return layer?.edges ?? []
    }
    return graph.edges
  }, [isCrossLayerPeek, nodeId, layers, graph.edges])

  const step = nodeToStep(node, nodeEdges)
  const cm = COLOR_MAP[node.type] || COLOR_MAP.dough
  const typeEntry = STEP_TYPES.find((t) => t.key === node.type)

  // Resolve the layer this node belongs to (for the layer pill in the header)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)
  const nodeLayerId = isCrossLayerPeek ? nodeId.split(':')[0] : activeLayerId
  const nodeLayer = layers.find((l) => l.id === nodeLayerId)

  return (
    <div
      className="bg-card border-l shadow-lg overflow-y-auto flex flex-col"
      style={{
        width: 380,
        borderColor: isPeek ? stepColor(cm.txVar, 0.38) : undefined,
        borderStyle: isPeek ? 'dashed' : undefined,
        borderLeftWidth: isPeek ? 2 : undefined,
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-3 pt-2.5 pb-2 border-b shrink-0"
        style={{ backgroundColor: stepColor(cm.bgVar), borderColor: stepColor(cm.txVar, 0.19) }}
      >
        <div className="flex items-center gap-2">
          {isPeek && (
            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-card/60" style={{ color: stepColor(cm.txVar) }}>
              peek
            </span>
          )}
          <span className="text-lg">{typeEntry?.icon || '📋'}</span>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={node.data.title}
              onChange={(e) => !isCrossLayerPeek && updateNodeCosmetic(bareNodeId, { title: e.target.value })}
              placeholder={t(typeEntry?.labelKey || node.type)}
              disabled={isCrossLayerPeek}
              className="text-sm font-bold bg-transparent outline-none w-full truncate placeholder:opacity-50 disabled:cursor-default"
              style={{ color: stepColor(cm.txVar) }}
            />
            <div className="text-[10px] opacity-70" style={{ color: stepColor(cm.txVar) }}>
              {t(cm.lbKey)} · {fmtDuration(getNodeDuration(node, meta.type, meta.subtype, portioning.thickness))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:bg-foreground/5"
            style={{ color: stepColor(cm.txVar) }}
          >
            ▶
          </button>
        </div>
        {nodeLayer && (
          <div className="flex justify-end items-center gap-1.5 mt-1">
            <span
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: nodeLayer.color }}
            >
              {nodeLayer.name}
            </span>
            <span
              className="text-[9px] font-medium px-2 py-0.5 rounded-full border"
              style={{ borderColor: nodeLayer.color + '60', color: nodeLayer.color }}
            >
              {t(LAYER_TYPE_META[nodeLayer.type].labelKey)} / {t(getSubtypeLabelKey(nodeLayer.type, nodeLayer.subtype))}
            </span>
          </div>
        )}
      </div>

      {/* Per-node warnings */}
      {nodeWarnings.length > 0 && (
        <NodeWarningSection warnings={nodeWarnings} />
      )}

      {/* StepBody with bridge context */}
      <div className="p-2 flex-1 overflow-y-auto">
        <RecipeProvider calc={bridge}>
          <StepBody step={step} />
        </RecipeProvider>

        {/* Split-specific config panel */}
        {node.type === 'split' && (
          <SplitConfigPanel nodeId={nodeId} />
        )}

        {/* Join-specific config panel */}
        {node.type === 'join' && (
          <JoinConfigPanel nodeId={nodeId} />
        )}

        {/* Visual style reveal */}
        <NodeStylePanel
          style={node.data.style}
          onChange={(s) => updateNodeCosmetic(nodeId, { style: s })}
        />
      </div>

      {/* Footer — Delete node */}
      {!isPeek && (
        <div className="sticky bottom-0 border-t bg-card px-3 py-2 shrink-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className="w-full text-sm text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-md py-2 font-medium cursor-pointer">
                {t('btn_delete_node')}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('dialog_delete_step_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('dialog_delete_step_message', { title: node.data.title || t(typeEntry?.labelKey || node.type) })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('btn_cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => removeNode(nodeId)} className="bg-destructive hover:bg-destructive/90">
                  {t('btn_delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

// ── Per-node warning section ─────────────────────────────────────

function NodeWarningSection({ warnings }: { warnings: ActionableWarning[] }) {
  const applyAllWarningActions = useRecipeFlowStore((s) => s.applyAllWarningActions)
  if (warnings.length === 0) return null

  const deduped = deduplicateWarnings(warnings)
  const actionable = deduped.filter((w) => w.actions && w.actions.length > 0)
  const informational = deduped.filter((w) => !w.actions || w.actions.length === 0)

  return (
    <div className="px-2 pt-2 space-y-1.5">
      {actionable.length > 0 && (
        <ActionableWarningBox
          warnings={actionable}
          onApplyAll={() => applyAllWarningActions()}
        />
      )}
      {informational.map((w) => (
        <WarningCard key={w.id} warning={w} />
      ))}
    </div>
  )
}

// ── Main panel container ────────────────────────────────────────

export function NodeDetailPanel() {
  const expandedNodeId = useRecipeFlowStore((s) => s.expandedNodeId)
  const peekNodeIds = useRecipeFlowStore((s) => s.peekNodeIds)
  const expandNode = useRecipeFlowStore((s) => s.expandNode)
  const closePeek = useRecipeFlowStore((s) => s.closePeek)

  const hasAnyPanel = expandedNodeId || peekNodeIds.length > 0
  if (!hasAnyPanel) return null

  return (
    <div className="absolute top-0 right-0 z-20 h-full flex">
      {/* Peek panels (rendered first = leftmost) */}
      {peekNodeIds.map((id) => (
        <SinglePanel
          key={id}
          nodeId={id}
          isPeek={true}
          onClose={() => closePeek(id)}
        />
      ))}

      {/* Selected panel (rightmost) */}
      {expandedNodeId && (
        <SinglePanel
          key={expandedNodeId}
          nodeId={expandedNodeId}
          isPeek={false}
          onClose={() => expandNode(null)}
        />
      )}
    </div>
  )
}
