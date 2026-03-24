/**
 * Migration from Recipe v1 (steps[] + deps[]) to Recipe v2 (graph: nodes[] + edges[]).
 */

import type { Recipe, RecipeStep } from '@commons/types/recipe'
import type {
  RecipeV2,
  RecipeGraph,
  RecipeNode,
  RecipeEdge,
  NodeTypeKey,
  NodeData,
  SplitOutput,
} from '@commons/types/recipe-graph'

/**
 * Convert a single RecipeStep to a RecipeNode.
 */
function stepToNode(step: RecipeStep, allEdges: RecipeEdge[]): RecipeNode {
  const data: NodeData = {
    title: step.title,
    desc: step.desc,
    group: step.group,
    baseDur: step.baseDur,
    restDur: step.restDur,
    restTemp: step.restTemp,

    // Ingredients — 1:1 mapping
    flours: step.flours,
    liquids: step.liquids,
    extras: step.extras,
    yeasts: step.yeasts ?? [],
    salts: step.salts ?? [],
    sugars: step.sugars ?? [],
    fats: step.fats ?? [],

    // Type-specific
    kneadMethod: step.kneadMethod,
    riseMethod: step.riseMethod,
    sourcePrep: step.sourcePrep,
    shapeCount: step.shapeCount,
    ovenCfg: step.ovenCfg,
    preFermentCfg: step.preFermentCfg,
  }

  // Generate splitOutputs for split nodes
  if (step.type === 'split') {
    const outEdges = allEdges.filter((e) => e.source === step.id)
    const n = outEdges.length || 2
    const pctEach = Math.round(100 / n)
    data.splitMode = 'pct'
    data.splitOutputs = Array.from({ length: n }, (_, i): SplitOutput => ({
      handle: `out_${i}`,
      label: `Parte ${i + 1}`,
      value: i === n - 1 ? 100 - pctEach * (n - 1) : pctEach, // last one gets remainder
    }))
  }

  // Set joinMethod for join nodes
  if (step.type === 'join') {
    data.joinMethod = (step.subtype as any) || 'generic'
  }

  return {
    id: step.id,
    type: step.type as NodeTypeKey,
    subtype: step.subtype,
    position: { x: 0, y: 0 },
    lane: 'main',
    data,
  }
}

/**
 * Convert step deps to RecipeEdges, assigning sourceHandle/targetHandle
 * for split and join nodes.
 */
function depsToEdges(steps: RecipeStep[]): RecipeEdge[] {
  const edges: RecipeEdge[] = []
  const stepMap = new Map(steps.map((s) => [s.id, s]))

  for (const step of steps) {
    for (let depIdx = 0; depIdx < step.deps.length; depIdx++) {
      const dep = step.deps[depIdx]
      const parentStep = stepMap.get(dep.id)

      // Determine sourceHandle: if parent is a split node, assign out_N
      let sourceHandle: string | undefined
      if (parentStep?.type === 'split') {
        // Find which output index this target corresponds to
        // Count how many edges we've already created FROM this split
        const existingFromSplit = edges.filter((e) => e.source === dep.id).length
        sourceHandle = `out_${existingFromSplit}`
      }

      // Determine targetHandle: if this step is a join node, assign in_N
      let targetHandle: string | undefined
      if (step.type === 'join') {
        targetHandle = `in_${depIdx}`
      }

      edges.push({
        id: `e_${dep.id}__${step.id}`,
        source: dep.id,
        target: step.id,
        sourceHandle,
        targetHandle,
        data: {
          scheduleTimeRatio: dep.wait ?? 1,
          scheduleQtyRatio: dep.grams ?? 1,
        },
      })
    }
  }
  return edges
}

/**
 * Migrate a Recipe v1 to RecipeV2 format.
 * Positions are set to (0,0) — call autoLayout() afterward to compute them.
 */
export function migrateRecipeV1toV2(old: Recipe): RecipeV2 {
  // First pass: create edges (needed to count split outputs)
  const edges = depsToEdges(old.steps)

  // Second pass: create nodes (uses edges to generate splitOutputs)
  const nodes = old.steps.map((step) => stepToNode(step, edges))

  const graph: RecipeGraph = {
    nodes,
    edges,
    lanes: [
      {
        id: 'main',
        label: 'Panificazione',
        isMain: true,
        origin: { type: 'user' },
      },
    ],
  }

  return {
    version: 2,
    meta: old.meta,
    portioning: old.portioning,
    ingredientGroups: old.ingredientGroups,
    graph,
  }
}

/**
 * Check if a recipe is v1 (has steps[] but no graph).
 */
export function isRecipeV1(recipe: unknown): recipe is Recipe {
  return (
    typeof recipe === 'object' &&
    recipe !== null &&
    'steps' in recipe &&
    Array.isArray((recipe as Recipe).steps) &&
    !('graph' in recipe)
  )
}

/**
 * Ensure a recipe is in v2 format. If v1, migrate it.
 */
export function ensureRecipeV2(recipe: Recipe | RecipeV2): RecipeV2 {
  if ('graph' in recipe && recipe.graph) {
    return recipe as RecipeV2
  }
  return migrateRecipeV1toV2(recipe as Recipe)
}
