import { useMemo } from 'react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { nodeToStep, stepToNodeData, graphToRecipeV1 } from '@commons/utils/graph-adapter'
import { celsiusToFahrenheit } from '@commons/utils/format'
import { computeGraphTotals } from '~/hooks/useGraphCalculator'
import { getNodeDuration } from '~/hooks/useGraphCalculator'
import { RecipeProvider } from '~/components/recipe/RecipeContext'
import { StepBody } from '~/components/recipe/StepBody'
import { SplitConfigPanel } from './SplitConfigPanel'
import { JoinConfigPanel } from './JoinConfigPanel'
import { COLOR_MAP, STEP_TYPES, KNEAD_METHODS } from '@/local_data'
import { fmtDuration } from '@commons/utils/format'
import { calcFinalDoughTemp } from '@commons/utils/dough-manager'
import type { RecipeCalculator } from '~/hooks/useRecipeCalculator'
import type { RecipeStep, Recipe } from '@commons/types/recipe'
import type { RecipeNode } from '@commons/types/recipe-graph'

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
  const graph = useRecipeFlowStore((s) => s.graph)
  const meta = useRecipeFlowStore((s) => s.meta)
  const portioning = useRecipeFlowStore((s) => s.portioning)
  const ingredientGroups = useRecipeFlowStore((s) => s.ingredientGroups)
  const temperatureUnit = useRecipeFlowStore((s) => s.temperatureUnit)
  const ambientTemp = useRecipeFlowStore((s) => s.ambientTemp)
  const updateNodeData = useRecipeFlowStore((s) => s.updateNodeData)
  const updateNodeWithReconcile = useRecipeFlowStore((s) => s.updateNodeWithReconcile)
  const setTemperatureUnit = useRecipeFlowStore((s) => s.setTemperatureUnit)
  const removeNode = useRecipeFlowStore((s) => s.removeNode)
  const storeAddDep = useRecipeFlowStore((s) => s.addDep)
  const storeRemoveDep = useRecipeFlowStore((s) => s.removeDep)
  const storeUpdateDep = useRecipeFlowStore((s) => s.updateDep)

  const node = graph.nodes.find((n) => n.id === nodeId)

  const recipe: Recipe = useMemo(
    () => graphToRecipeV1(graph, meta, portioning, ingredientGroups),
    [graph, meta, portioning, ingredientGroups],
  )

  const totals = useMemo(() => computeGraphTotals(graph), [graph])

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

    const getFDT = (s: RecipeStep | null) => {
      if (!s || !s.flours.length) return ambientTemp
      const km = KNEAD_METHODS.find((m) => m.key === s.kneadMethod) || KNEAD_METHODS[0]
      return calcFinalDoughTemp(s.flours, s.liquids, ambientTemp, km.ff)
    }

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
      editMode: true,
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
  }, [recipe, graph, meta, portioning, temperatureUnit, ambientTemp, totals, updateNodeData, setTemperatureUnit, storeAddDep, storeRemoveDep, storeUpdateDep])

  if (!node) return null

  const step = nodeToStep(node, graph.edges)
  const cm = COLOR_MAP[node.type] || COLOR_MAP.dough
  const typeEntry = STEP_TYPES.find((t) => t.key === node.type)

  return (
    <div
      className="bg-white border-l shadow-lg overflow-y-auto flex flex-col"
      style={{
        width: 380,
        borderColor: isPeek ? cm.tx + '60' : undefined,
        borderStyle: isPeek ? 'dashed' : undefined,
        borderLeftWidth: isPeek ? 2 : undefined,
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-3 py-2.5 border-b flex items-center gap-2 shrink-0"
        style={{ backgroundColor: cm.bg, borderColor: cm.tx + '30' }}
      >
        {isPeek && (
          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/60" style={{ color: cm.tx }}>
            peek
          </span>
        )}
        <span className="text-lg">{typeEntry?.icon || '📋'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: cm.tx }}>
            {node.data.title || typeEntry?.label || node.type}
          </div>
          <div className="text-[10px] opacity-70" style={{ color: cm.tx }}>
            {cm.lb} · {fmtDuration(getNodeDuration(node, meta.type, meta.subtype, portioning.thickness))}
          </div>
        </div>
        {!isPeek && (
          <button
            type="button"
            onClick={() => removeNode(nodeId)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs bg-red-50 text-red-600 hover:bg-red-100"
            title={t('btn_delete')}
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:bg-black/5"
          style={{ color: cm.tx }}
        >
          ▶
        </button>
      </div>

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
      </div>
    </div>
  )
}

// ── Main panel container ────────────────────────────────────────

export function NodeDetailPanel() {
  const t = useT()
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
