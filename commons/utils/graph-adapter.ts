/**
 * Adapter functions to convert between RecipeNode (v2 graph) and RecipeStep (v1).
 * This enables reusing StepBody and all its sub-components with the new graph model.
 */

import type { RecipeStep, Recipe } from '@commons/types/recipe'
import type { RecipeNode, RecipeGraph, RecipeEdge, NodeData } from '@commons/types/recipe-graph'

/**
 * Convert a RecipeNode to a RecipeStep for use with StepBody.
 * Deps are reconstructed from graph edges targeting this node.
 */
export function nodeToStep(node: RecipeNode, edges: RecipeEdge[]): RecipeStep {
  const inEdges = edges.filter((e) => e.target === node.id)
  return {
    id: node.id,
    title: node.data.title,
    type: node.type,
    subtype: node.subtype,
    group: node.data.group,
    baseDur: node.data.baseDur,
    restDur: node.data.restDur,
    restTemp: node.data.restTemp,
    deps: inEdges.map((e) => ({
      id: e.source,
      wait: e.data?.scheduleTimeRatio ?? 1,
      grams: e.data?.scheduleQtyRatio ?? 1,
    })),
    kneadMethod: node.data.kneadMethod ?? null,
    desc: node.data.desc,
    flours: node.data.flours,
    liquids: node.data.liquids,
    extras: node.data.extras,
    yeasts: node.data.yeasts ?? [],
    salts: node.data.salts ?? [],
    sugars: node.data.sugars ?? [],
    fats: node.data.fats ?? [],
    riseMethod: node.data.riseMethod ?? null,
    ovenCfg: node.data.ovenCfg ?? null,
    cookingCfg: node.data.cookingCfg ?? null,
    preBakeCfg: node.data.preBakeCfg ?? null,
    cookingFats: node.data.cookingFats ?? [],
    sourcePrep: node.data.sourcePrep ?? null,
    shapeCount: node.data.shapeCount ?? null,
    preFermentCfg: node.data.preFermentCfg ?? null,
  }
}

/**
 * Apply a RecipeStep mutation back to the NodeData.
 * Takes the updated step and extracts the NodeData-relevant fields.
 */
export function stepToNodeData(step: RecipeStep): Partial<NodeData> {
  return {
    title: step.title,
    desc: step.desc,
    group: step.group,
    baseDur: step.baseDur,
    restDur: step.restDur,
    restTemp: step.restTemp,
    flours: step.flours,
    liquids: step.liquids,
    extras: step.extras,
    yeasts: step.yeasts,
    salts: step.salts,
    sugars: step.sugars,
    fats: step.fats,
    kneadMethod: step.kneadMethod,
    riseMethod: step.riseMethod,
    ovenCfg: step.ovenCfg,
    cookingCfg: step.cookingCfg,
    preBakeCfg: step.preBakeCfg,
    cookingFats: step.cookingFats,
    sourcePrep: step.sourcePrep,
    shapeCount: step.shapeCount,
    preFermentCfg: step.preFermentCfg,
  }
}

/**
 * Build a minimal Recipe (v1) from a RecipeGraph for use with components
 * that expect the old Recipe interface (e.g., RecipeContext).
 */
export function graphToRecipeV1(
  graph: RecipeGraph,
  meta: { name: string; author: string; type: string; subtype: string },
  portioning: Recipe['portioning'],
  ingredientGroups: string[],
): Recipe {
  const steps = graph.nodes.map((n) => nodeToStep(n, graph.edges))
  return {
    meta,
    portioning,
    ingredientGroups,
    steps,
  }
}
