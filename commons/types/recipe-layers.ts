/**
 * Recipe Layers data model (v3).
 *
 * Extends the v2 graph model with multi-layer support: each recipe contains
 * one or more layers (impasto, sauce, prep, ferment, pastry), each with its
 * own node graph. Cross-layer edges connect outputs between layers.
 */

import type {
  RecipeMeta,
  Portioning,
} from './recipe'

import type {
  RecipeNode,
  RecipeEdge,
  RecipeEdgeData,
  LaneDefinition,
} from './recipe-graph'

// ── Layer Type ───────────────────────────────────────────────────

export type LayerType = 'impasto' | 'sauce' | 'prep' | 'ferment' | 'pastry'

// ── Master Configs (per layer type) ──────────────────────────────

/** Impasto layer reuses the existing Portioning config as-is. */
export type ImpastoMasterConfig = Portioning

export interface SauceMasterConfig {
  sauceType: string
  targetVolume: number
  targetConsistency: 'thin' | 'medium' | 'thick'
  serving: number
  shelfLife: number
}

export interface PrepMasterConfig {
  prepType: string
  servings: number
  yield: number
}

export interface FermentMasterConfig {
  fermentType: string
  saltPercentage: number
  targetPH: number
  temperature: number
  duration: number
  vessel: string
}

export interface PastryMasterConfig {
  pastryType: string
  targetWeight: number
  servings: number
  temperatureNotes: string
}

/** Discriminated union of all master configs, keyed by layer type. */
export type MasterConfig =
  | { type: 'impasto'; config: ImpastoMasterConfig }
  | { type: 'sauce'; config: SauceMasterConfig }
  | { type: 'prep'; config: PrepMasterConfig }
  | { type: 'ferment'; config: FermentMasterConfig }
  | { type: 'pastry'; config: PastryMasterConfig }

// ── Recipe Layer ─────────────────────────────────────────────────

export interface RecipeLayer {
  id: string
  type: LayerType
  subtype: string
  variant: string
  name: string
  color: string
  icon: string
  position: number
  visible: boolean
  locked: boolean
  masterConfig: MasterConfig
  nodes: RecipeNode[]
  edges: RecipeEdge[]
  lanes: LaneDefinition[]
  viewport?: { x: number; y: number; zoom: number }
}

// ── Cross-Layer Edge ─────────────────────────────────────────────

export interface CrossLayerEdge {
  id: string
  sourceLayerId: string
  sourceNodeId: string
  targetLayerId: string
  targetNodeId: string
  label?: string
  data: RecipeEdgeData
}

// ── Recipe v3 ────────────────────────────────────────────────────

export interface RecipeV3 {
  version: 3
  meta: RecipeMeta
  ingredientGroups: string[]
  layers: RecipeLayer[]
  crossEdges: CrossLayerEdge[]
}
