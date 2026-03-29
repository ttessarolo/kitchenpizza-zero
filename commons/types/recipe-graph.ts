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
  CookingConfig,
  PreBakeConfig,
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
  | 'post_bake'
  | 'prep'
  | 'split'
  | 'join'
  // Multi-layer shared
  | 'ingredient'
  | 'cook'
  | 'mix'
  // Sauce layer
  | 'blend'
  | 'emulsify'
  | 'strain'
  | 'season'
  // Prep layer
  | 'wash'
  | 'cut'
  | 'peel'
  | 'grate'
  | 'stuff'
  | 'assemble'
  | 'plate'
  | 'garnish'
  // Ferment layer
  | 'brine'
  | 'inoculate'
  | 'ferment_node'
  | 'check'
  | 'store'
  // Pastry layer
  | 'whip'
  | 'temper'
  | 'fold'
  | 'chill'
  | 'mold'
  | 'glaze'

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
  [key: string]: unknown
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
  /** @deprecated Use cookingCfg instead. Kept for backward compatibility. */
  ovenCfg?: OvenConfig | null           // bake, prep:cook(oven)
  cookingCfg?: CookingConfig | null     // bake (all sub-types)
  preBakeCfg?: PreBakeConfig | null     // pre_bake (boil, dock, flour_dust, oil_coat, steam_inject)
  /** Fats used for cooking (frying, pan, etc.) — NOT counted in dough totals. */
  cookingFats?: FatIngredient[]
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
  /** ID of the advisory rule that created this node (via addNodeAfter action). */
  advisorySourceId?: string
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
  [key: string]: unknown
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

// ── Advisory Context (for rule evaluation) ──────────────────────

export interface AdvisoryContext {
  nodeId?: string
  nodeType: string
  nodeSubtype: string | null
  nodeData: NodeData
  ovenCfg?: OvenConfig | null
  recipeType: string
  recipeSubtype: string | null
  baseDur: number
  totalFlour: number
  yeastPct: number
  saltPct: number
  fatPct: number
  hydration: number
  flourW: number
  // Cooking config (all bake sub-types)
  cookingCfg?: import('./recipe').CookingConfig | null
  preBakeCfg?: import('./recipe').PreBakeConfig | null
  _cookingMethod?: string
  // Baking profile computed values (injected by caller)
  _tempMin?: number
  _tempMax?: number
  _suggestedTemp?: number
  _cieloMin?: number
  _cieloMax?: number
  _recommendedModes?: string[]
  _isPrecottura?: boolean
  // Frying-specific
  _oilTemp?: number
  _oilTempMin?: number
  _oilTempMax?: number
  _maxDoughWeight?: number
  // Grilling-specific
  _directTemp?: number
  _directTempMin?: number
  _directTempMax?: number
  [key: string]: unknown
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
  labelKey: string
  descriptionKey?: string
  mutations: GraphMutation[]
}

/** A warning with optional actionable suggestions */
export interface ActionableWarning {
  id: string
  sourceNodeId?: string
  category: 'yeast' | 'salt' | 'fat' | 'hydration' | 'temp' | 'baking' | 'flour' | 'steam' | 'general' | 'frying' | 'grilling' | 'pre_bake' | 'fermentation'
  severity: 'info' | 'warning' | 'error'
  messageKey: string
  messageVars?: Record<string, unknown>
  /** Evaluation context for action mutations to resolve computed values */
  _ctx?: Record<string, unknown>
  actions?: WarningAction[]
}

/** A warning deduplicated for UI display — same messageKey grouped with count */
export interface DedupedWarning extends ActionableWarning {
  count: number
  affectedNodeIds: string[]
}

// ── Layer types (v3) re-exports ──────────────────────────────────

export type {
  LayerType,
  ImpastoMasterConfig,
  SauceMasterConfig,
  PrepMasterConfig,
  FermentMasterConfig,
  PastryMasterConfig,
  MasterConfig,
  RecipeLayer,
  CrossLayerEdge,
  RecipeV3,
} from './recipe-layers'
