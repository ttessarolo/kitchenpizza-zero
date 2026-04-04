/**
 * Warning helpers — derive per-layer warnings from the flat store array.
 *
 * Warnings have sourceNodeId but no layerId. We compute the association
 * by looking up which layer contains the node.
 *
 * Two modes:
 * - "strict" (for icon badge): only warnings with sourceNodeId matching a layer node
 * - "active" (for warning box): strict + canonical warnings (no sourceNodeId) for active layer
 */

import type { ActionableWarning } from '@commons/types/recipe-graph'
import type { RecipeLayer } from '@commons/types/recipe-layers'

/** Build a nodeId → layerId lookup from all layers. */
function buildNodeLayerMap(layers: RecipeLayer[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const layer of layers) {
    for (const node of layer.nodes) {
      map.set(node.id, layer.id)
    }
  }
  return map
}

/**
 * Check if a layer has warnings (strict: only sourceNodeId-based).
 * Used for the warning icon in the layer list.
 */
export function hasLayerWarnings(
  layerId: string,
  warnings: ActionableWarning[],
  layers: RecipeLayer[],
): boolean {
  if (warnings.length === 0) return false
  const nodeLayerMap = buildNodeLayerMap(layers)
  return warnings.some(w =>
    w.sourceNodeId && nodeLayerMap.get(w.sourceNodeId) === layerId
  )
}

/**
 * Get warnings for a specific layer (strict: sourceNodeId-based only).
 * Used for the warning box in the left sidebar.
 */
export function getActiveLayerWarnings(
  activeLayerId: string,
  warnings: ActionableWarning[],
  layers: RecipeLayer[],
): ActionableWarning[] {
  const nodeLayerMap = buildNodeLayerMap(layers)
  return warnings.filter(w => {
    if (w.sourceNodeId) return nodeLayerMap.get(w.sourceNodeId) === activeLayerId
    // Canonical warnings (no sourceNodeId) → include for active layer
    return true
  })
}

/**
 * Get warnings strictly belonging to a specific layer (sourceNodeId-based only).
 */
export function getLayerWarnings(
  layerId: string,
  warnings: ActionableWarning[],
  layers: RecipeLayer[],
): ActionableWarning[] {
  const nodeLayerMap = buildNodeLayerMap(layers)
  return warnings.filter(w =>
    w.sourceNodeId && nodeLayerMap.get(w.sourceNodeId) === layerId
  )
}

/** Get all warnings grouped by layer. Strict mode (sourceNodeId only). */
export function getAllLayerWarnings(
  warnings: ActionableWarning[],
  layers: RecipeLayer[],
): Map<string, ActionableWarning[]> {
  const nodeLayerMap = buildNodeLayerMap(layers)
  const result = new Map<string, ActionableWarning[]>()

  for (const w of warnings) {
    if (!w.sourceNodeId) continue
    const layerId = nodeLayerMap.get(w.sourceNodeId)
    if (!layerId) continue
    const list = result.get(layerId)
    if (list) list.push(w)
    else result.set(layerId, [w])
  }

  return result
}
