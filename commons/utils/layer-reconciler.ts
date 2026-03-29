/**
 * Layer-aware reconciliation dispatcher.
 *
 * Routes to the correct reconciler strategy based on layer type.
 * For impasto: wraps the existing reconcileGraph (zero behavior change).
 * For other types: minimal reconciliation (topological sort + warnings).
 *
 * reconcileGraph is injected as a parameter to avoid circular imports
 * (it lives in app/server/services/, this file is in commons/).
 */

import type { RecipeGraph, ActionableWarning } from '@commons/types/recipe-graph'
import type { RecipeMeta, Portioning } from '@commons/types/recipe'
import type { RecipeLayer } from '@commons/types/recipe-layers'
import type { ScienceProvider } from '@commons/utils/science/science-provider'
import { topologicalSortGraph } from '@commons/utils/graph-utils'

// ── Result type ─────────────────────────────────────────────────

export interface LayerReconcileResult {
  layer: RecipeLayer
  warnings: ActionableWarning[]
}

// ── Helpers ─────────────────────────────────────────────────────

/** Extract a RecipeGraph from a layer */
export function layerToGraph(layer: RecipeLayer): RecipeGraph {
  return {
    nodes: layer.nodes,
    edges: layer.edges,
    lanes: layer.lanes,
    viewport: layer.viewport,
  }
}

/** Extract portioning from an impasto layer (null for others) */
export function layerToPortioning(layer: RecipeLayer): Portioning | null {
  return layer.masterConfig.type === 'impasto' ? layer.masterConfig.config : null
}

// ── Reconcile function type ─────────────────────────────────────

type ReconcileGraphFn = (
  graph: RecipeGraph,
  portioning: Portioning,
  meta: RecipeMeta,
  provider: ScienceProvider,
) => { graph: RecipeGraph; portioning: Portioning; warnings: ActionableWarning[] }

// ── Impasto strategy ────────────────────────────────────────────

function reconcileImpastoLayer(
  provider: ScienceProvider,
  layer: RecipeLayer,
  meta: RecipeMeta,
  reconcileGraphFn: ReconcileGraphFn,
): LayerReconcileResult {
  if (layer.masterConfig.type !== 'impasto') {
    throw new Error('reconcileImpastoLayer called with non-impasto layer')
  }

  const graph = layerToGraph(layer)
  const result = reconcileGraphFn(graph, layer.masterConfig.config, meta, provider)

  return {
    layer: {
      ...layer,
      nodes: result.graph.nodes,
      edges: result.graph.edges,
      lanes: result.graph.lanes,
      masterConfig: { type: 'impasto', config: result.portioning },
    },
    warnings: result.warnings,
  }
}

// ── Generic strategy (sauce, prep, ferment, pastry) ─────────────

function reconcileGenericLayer(
  _provider: ScienceProvider,
  layer: RecipeLayer,
  _meta: RecipeMeta,
): LayerReconcileResult {
  const graph = layerToGraph(layer)

  // Validate DAG (topologicalSortGraph throws on cycles)
  try {
    topologicalSortGraph(graph)
  } catch {
    return {
      layer,
      warnings: [{
        id: 'graph_cycle',
        category: 'general',
        severity: 'error',
        messageKey: 'warning_graph_cycle',
      }],
    }
  }

  return { layer, warnings: [] }
}

// ── Dispatcher ──────────────────────────────────────────────────

export function reconcileLayer(
  provider: ScienceProvider,
  layer: RecipeLayer,
  meta: RecipeMeta,
  reconcileGraphFn: ReconcileGraphFn,
): LayerReconcileResult {
  switch (layer.masterConfig.type) {
    case 'impasto':
      return reconcileImpastoLayer(provider, layer, meta, reconcileGraphFn)
    case 'sauce':
    case 'prep':
    case 'ferment':
    case 'pastry':
      return reconcileGenericLayer(provider, layer, meta)
  }
}
