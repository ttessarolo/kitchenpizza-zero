/**
 * BreadScience JSON format — TypeScript type definitions.
 *
 * Defines the 8 block types that express all scientific logic as data:
 * formula, factor_chain, piecewise, classification, rule, catalog, defaults.
 * Plus _meta for admin presentation and variants for alternative approaches.
 */

// ── Metadata (for admin panel presentation) ────────────────────

export interface BlockMeta {
  section: string
  displayName: string          // i18n key
  description: string          // i18n key
  tags: string[]
  lastModified?: string        // ISO date
  author?: string
}

// ── Output specification ───────────────────────────────────────

export interface OutputSpec {
  name: string
  unit?: string                // '%', 'min', 'h', '°C', 'g'
  round?: number               // decimal places
  min?: number                 // clamp minimum
  max?: number                 // clamp maximum
}

// ── Formula variant (alternative scientific approach) ──────────

export interface FormulaVariant {
  key: string
  nameKey: string              // i18n key
  descriptionKey: string       // i18n key
  expression: string           // expr-eval expression string
  constants?: Record<string, number>
  applicability?: {
    minHours?: number
    maxHours?: number
    minTemp?: number
    maxTemp?: number
    [key: string]: unknown
  }
  default?: boolean
}

// ── Block types ────────────────────────────────────────────────

/** 1. Formula — single mathematical expression */
export interface FormulaBlock {
  type: 'formula'
  id: string
  ref?: string                 // scientific reference "[C] Cap. 44"
  _meta?: BlockMeta
  expression?: string          // expr-eval expression (if no variants)
  constants?: Record<string, number>
  variants?: FormulaVariant[]  // alternative formulas
  inputs: string[]
  output: OutputSpec
  validation?: Record<string, { min?: number; max?: number }>
}

/** 2. Factor chain — base × f1 × f2 × ... × fN */
export interface FactorDef {
  id: string
  ref?: string
  expression?: string          // expr-eval expression for this factor
  source?: 'lookup' | 'input'  // lookup from catalog or direct input
  table?: string               // catalog name (if source=lookup)
  key?: string                 // lookup key ($ prefix = variable)
  field?: string               // field to extract from lookup result
}

export interface FactorChainBlock {
  type: 'factor_chain'
  id: string
  ref?: string
  _meta?: BlockMeta
  base: { value: number; unit?: string }
  factors: FactorDef[]
  output: OutputSpec
}

/** 3. Piecewise — step function */
export interface PiecewiseSegment {
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  eq?: unknown
  default?: boolean
  value: unknown
}

export interface PiecewiseBlock {
  type: 'piecewise'
  id: string
  ref?: string
  _meta?: BlockMeta
  input: string
  segments: PiecewiseSegment[]
  default: unknown
  output?: OutputSpec
}

/** 4. Classification — categorization */
export interface ClassificationClass {
  lt?: number
  lte?: number
  gt?: number
  gte?: number
  default?: boolean
  label: string
}

export interface ClassificationBlock {
  type: 'classification'
  id: string
  _meta?: BlockMeta
  input: string
  classes: ClassificationClass[]
}

/** 5. Rule — advisory/warning with conditions and actions */
export interface RuleCondition {
  field: string
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'exists'
  value: unknown
}

export interface RuleMutation {
  type: 'updateNode' | 'addNodeAfter' | 'removeNode' | 'updatePortioning'
  target?: { ref: string }
  patch?: Record<string, unknown>
  nodeType?: string
  subtype?: string
  data?: Record<string, unknown>
}

export interface RuleAction {
  key?: string
  labelKey: string             // i18n key
  descriptionKey?: string      // i18n key
  default?: boolean
  mutations: RuleMutation[]
}

export interface RuleBlock {
  type: 'rule'
  id: string
  ref?: string
  _meta?: BlockMeta
  category: string
  severity: 'info' | 'warning' | 'error'
  messageKey: string           // i18n key
  messageVars?: string[]       // context fields for interpolation
  conditions: RuleCondition[]
  excludeIf?: RuleCondition[]
  suppressedBy?: string[]
  selectionMode?: 'choose_one' | 'all'  // default: 'all'
  actions?: RuleAction[]
}

/** 6. Catalog — data table */
export interface CatalogBlock {
  type: 'catalog'
  id: string
  _meta?: BlockMeta
  entries: Record<string, unknown>[]
}

/** 7. Defaults — per type/subtype configuration */
export interface DefaultsBlock {
  type: 'defaults'
  id: string
  _meta?: BlockMeta
  entries: Record<string, unknown>[]
  fallback?: { chain: string[] }
}

// ── Union type ─────────────────────────────────────────────────

export type ScienceBlock =
  | FormulaBlock
  | FactorChainBlock
  | PiecewiseBlock
  | ClassificationBlock
  | RuleBlock
  | CatalogBlock
  | DefaultsBlock
