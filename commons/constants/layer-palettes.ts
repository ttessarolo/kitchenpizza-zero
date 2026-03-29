/**
 * Layer palettes — defines which NodeTypeKey values are allowed in each layer type.
 */

import type { LayerType } from '../types/recipe-layers'
import type { NodeTypeKey } from '../types/recipe-graph'

// ── Palette definitions ──────────────────────────────────────────

export const LAYER_PALETTES: Record<LayerType, ReadonlySet<NodeTypeKey>> = {
  impasto: new Set<NodeTypeKey>([
    'pre_dough', 'pre_ferment', 'dough', 'rest', 'rise', 'shape',
    'pre_bake', 'bake', 'done', 'post_bake', 'prep', 'split', 'join',
  ]),
  sauce: new Set<NodeTypeKey>([
    'ingredient', 'cook', 'blend', 'emulsify', 'strain', 'rest', 'season',
  ]),
  prep: new Set<NodeTypeKey>([
    'ingredient', 'wash', 'cut', 'peel', 'grate', 'mix', 'stuff',
    'assemble', 'plate', 'garnish', 'cook', 'rest',
  ]),
  ferment: new Set<NodeTypeKey>([
    'ingredient', 'brine', 'inoculate', 'ferment_node', 'check', 'store', 'rest',
  ]),
  pastry: new Set<NodeTypeKey>([
    'ingredient', 'cook', 'whip', 'temper', 'fold', 'chill', 'mold', 'rest', 'glaze',
  ]),
}

// ── Utility functions ────────────────────────────────────────────

/** Check whether a node type is allowed in a given layer type. */
export function isNodeTypeAllowed(layerType: LayerType, nodeType: NodeTypeKey): boolean {
  return LAYER_PALETTES[layerType].has(nodeType)
}

/** Get all allowed node types for a given layer type as an array. */
export function getAllowedNodeTypes(layerType: LayerType): NodeTypeKey[] {
  return [...LAYER_PALETTES[layerType]]
}
