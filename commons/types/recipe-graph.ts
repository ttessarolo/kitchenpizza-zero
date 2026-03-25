/**
 * Recipe Graph data model (v2).
 *
 * Replaces the flat steps[] + deps[] with an explicit graph of nodes + edges,
 * directly consumable by React Flow.
 */

import type {
  RecipeMeta,
  Portioning,
  FlourIngredient,
  LiquidIngredient,
  ExtraIngredient,
  YeastIngredient,
  SaltIngredient,
  SugarIngredient,
  FatIngredient,
  OvenConfig,
  PreFermentConfig,
} from './recipe'

// ── Node Type Keys ──────────────────────────────────────────────

export type NodeTypeKey =
  // Existing (panificazione)
  | 'pre_dough'
  | 'pre_ferment'
  | 'dough'
  | 'rest'
  | 'rise'
  | 'shape'
  | 'pre_bake'
  | 'bake'
  | 'done'
  // New
  | 'post_bake'
  | 'prep'
  | 'split'
  | 'join'

// ── Prep-specific enums ─────────────────────────────────────────

export type CookMethod =
  | 'pan'
  | 'oven'
  | 'steam'
  | 'sous_vide'
  | 'grill'
  | 'boil'
  | 'fry'
  | 'deep_fry'
  | 'blanch'
  | 'smoke'
  | 'torch'

export type CutStyle =
  | 'dice'
  | 'julienne'
  | 'brunoise'
  | 'chiffonade'
  | 'slice'
  | 'mince'
  | 'rough_chop'
  | 'wedge'
  | 'grate'
  | 'zest'

export type ApplicationMethod =
  | 'topping'
  | 'filling'
  | 'garnish'
  | 'glaze'
  | 'spread'
  | 'dip'
  | 'layer'

export type ApplicationTiming =
  | 'pre_bake'
  | 'post_bake'
  | 'during_bake'
  | 'serve'

// ── Join method ─────────────────────────────────────────────────

export type JoinMethod =
  | 'braid'
  | 'layer'
  | 'fold'
  | 'enclose'
  | 'mix'
  | 'side_by_side'
  | 'generic'

// ── Split output ────────────────────────────────────────────────

export interface SplitOutput {
  handle: string        // "out_0", "out_1", ...
  label: string         // "Pane bianco (70%)"
  value: number         // % or grams depending on splitMode
}

// ── Node Data ───────────────────────────────────────────────────

export interface NodeData {
  // ── Common ──
  title: string
  desc: string
  group: string
  baseDur: number
  restDur: number
  restTemp: number | null

  // ── Ingredients (same structure as RecipeStep) ──
  flours: FlourIngredient[]
  liquids: LiquidIngredient[]
  extras: ExtraIngredient[]
  yeasts: YeastIngredient[]
  salts: SaltIngredient[]
  sugars: SugarIngredient[]
  fats: FatIngredient[]

  // ── Type-specific (optional) ──
  kneadMethod?: string | null           // dough
  riseMethod?: string | null            // rise
  sourcePrep?: string | null            // rise, shape
  shapeCount?: number | null            // shape
  ovenCfg?: OvenConfig | null           // bake, prep:cook(oven)
  preFermentCfg?: PreFermentConfig | null // pre_ferment

  // ── Prep ──
  cookMethod?: CookMethod | null
  cookTemp?: number | null
  applicationMethod?: ApplicationMethod | null
  applicationTiming?: ApplicationTiming | null
  prepTool?: string | null
  cutStyle?: CutStyle | null
  marinadeTemp?: number | null
  targetTemp?: number | null

  // ── Split ──
  splitMode?: 'pct' | 'grams'
  splitOutputs?: SplitOutput[]

  // ── Join ──
  joinMethod?: JoinMethod | null

  // ── Duration override ──
  /** If true, reconcileGraph() will NOT recalculate baseDur for this node.
   *  Set to true when the user manually changes the duration. */
  userOverrideDuration?: boolean
}

// ── Recipe Node ─────────────────────────────────────────────────

export interface RecipeNode {
  id: string
  type: NodeTypeKey
  subtype: string | null
  position: { x: number; y: number }
  lane: string                          // "main" | auto-derived | user-renamed
  data: NodeData
}

// ── Edge Data (Schedule Conditions) ─────────────────────────────
//
// Both fields are SCHEDULING parameters that determine WHEN a node can START.
// They do NOT affect ingredient flow (that's handled by split outputs).

export interface RecipeEdgeData {
  /**
   * Schedule condition: TIME completion ratio (0–1).
   * The target node can start when the source node has completed
   * this fraction of its duration.
   *   0   = start immediately (parallel)
   *   0.5 = start when source is 50% done in time
   *   1   = start when source is fully complete (default, sequential)
   */
  scheduleTimeRatio: number

  /**
   * Schedule condition: QUANTITY production ratio (0–1).
   * The target node can start when the source node has produced
   * this fraction of its output quantity.
   *   1   = start when all quantity is ready (default)
   *   0.3 = start when 30% of the quantity is ready (pipeline)
   */
  scheduleQtyRatio: number

  label?: string
}

// ── Recipe Edge ─────────────────────────────────────────────────

export interface RecipeEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null          // split: "out_0", ...
  targetHandle?: string | null          // join: "in_0", ...
  data: RecipeEdgeData
}

// ── Lane Definition ─────────────────────────────────────────────

export interface LaneDefinition {
  id: string
  label: string
  color?: string
  isMain: boolean
  origin?: {
    type: 'user' | 'split' | 'prep'
    splitNodeId?: string
  }
}

// ── Recipe Graph ────────────────────────────────────────────────

export interface RecipeGraph {
  nodes: RecipeNode[]
  edges: RecipeEdge[]
  lanes: LaneDefinition[]
  viewport?: { x: number; y: number; zoom: number }
}

// ── Recipe v2 ───────────────────────────────────────────────────

export interface RecipeV2 {
  version: 2
  meta: RecipeMeta
  portioning: Portioning
  ingredientGroups: string[]
  graph: RecipeGraph
}

// ── Scheduled node (computed, like ScheduledStep) ───────────────

export interface ScheduledNode extends RecipeNode {
  dur: number
  start: Date
  end: Date
}

// ── Actionable Warnings ─────────────────────────────────────────

/** Relative reference to a node in the graph — resolved at execution time */
export type NodeRef =
  | { ref: 'self' }
  | { ref: 'upstream_dough' }
  | { ref: 'downstream_rise' }
  | { ref: 'downstream_bake' }
  | { ref: 'new_after_self' }

/** A single mutation to apply to the graph */
export type GraphMutation =
  | { type: 'updateNode'; target: NodeRef; patch: Record<string, unknown> }
  | { type: 'addNodeAfter'; target: NodeRef; nodeType: string; subtype?: string; data?: Partial<NodeData> }
  | { type: 'removeNode'; target: NodeRef }
  | { type: 'updatePortioning'; patch: Record<string, unknown> }

/** An action the user can accept to resolve a warning */
export interface WarningAction {
  label: string
  mutations: GraphMutation[]
}

/** A warning with optional actionable suggestions */
export interface ActionableWarning {
  id: string
  sourceNodeId?: string
  category: 'yeast' | 'salt' | 'fat' | 'hydration' | 'temp' | 'baking' | 'flour' | 'steam' | 'general'
  severity: 'info' | 'warning' | 'error'
  message: string
  actions?: WarningAction[]
}
