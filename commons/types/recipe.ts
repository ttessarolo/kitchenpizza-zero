// ── Catalog entry types ──────────────────────────────────────────

export interface RecipeTypeEntry {
  key: string
  label: string
  icon: string
}

export interface RecipeSubtypeDefaults {
  mode: PortioningMode
  hyd: number
  thickness: number
  ballG: number
}

export interface RecipeSubtypeEntry {
  key: string
  label: string
  defaults: RecipeSubtypeDefaults
}

export interface TrayPreset {
  key: string
  label: string
  l: number
  w: number
  h: number
  material: string
  griglia: boolean
}

export interface TrayMaterial {
  key: string
  label: string
  bMin: number
  bMax: number
  defTemp: number
}

export interface FlourCatalogEntry {
  key: string
  group: string
  label: string
  sub: string
  protein: number
  W: number
  PL: number
  absorption: number
  ash: number
  fiber: number
  starchDamage: number
  fermentSpeed: number
}

export interface RiseMethod {
  key: string
  label: string
  tf: number
}

export interface YeastType {
  key: string
  label: string
  toFresh: number
  speedF: number
  hasFW: boolean
}

export interface OvenTypeEntry {
  key: string
  label: string
}

export interface OvenModeEntry {
  key: string
  label: string
}

export interface KneadMethod {
  key: string
  label: string
  ff: number
}

export interface StepTypeEntry {
  key: string
  label: string
  icon: string
}

export interface ColorMapEntry {
  bg: string
  tx: string
  lb: string
}

// ── Domain model types ───────────────────────────────────────────

export type PortioningMode = 'tray' | 'ball'

export interface Tray {
  preset: string
  l: number
  w: number
  h: number
  material: string
  griglia: boolean
  count: number
}

export interface Ball {
  weight: number
  count: number
}

export interface Portioning {
  mode: PortioningMode
  tray: Tray
  ball: Ball
  thickness: number
  targetHyd: number
}

export interface RecipeMeta {
  name: string
  author: string
  type: string
  subtype: string
}

export interface FlourIngredient {
  id: number
  type: string
  g: number
  temp: number | null
}

export interface LiquidIngredient {
  id: number
  type: string
  g: number
  temp: number | null
}

export interface ExtraIngredient {
  id: number
  name: string
  g: number
  unit?: string
}

export interface YeastIngredient {
  id: number
  type: string
  g: number
}

export interface OvenConfig {
  panType: string
  ovenType: string
  ovenMode: string
  temp: number
  cieloPct: number
}

export interface StepDep {
  id: string
  wait: number    // 0-1, scheduling: fraction of parent's duration before child can start
  grams: number   // 0-1, ingredient flow: fraction of parent's total weight that flows to child
}

export interface RecipeStep {
  id: string
  title: string
  type: string
  group: string
  baseDur: number
  deps: StepDep[]
  kneadMethod: string | null
  desc: string
  flours: FlourIngredient[]
  liquids: LiquidIngredient[]
  extras: ExtraIngredient[]
  yeasts: YeastIngredient[]
  riseMethod: string | null
  ovenCfg: OvenConfig | null
  sourcePrep: string | null
  shapeCount: number | null
}

export interface Recipe {
  meta: RecipeMeta
  portioning: Portioning
  ingredientGroups: string[]
  steps: RecipeStep[]
}

// ── Computed / derived types ─────────────────────────────────────

export interface BlendedFlourProps {
  protein: number
  W: number
  absorption: number
  starchDamage: number
  fermentSpeed: number
}

export interface ScheduledStep extends RecipeStep {
  dur: number
  start: Date
  end: Date
  aE: Date | null
}

export interface TimeSummary {
  total: number
  prep: number
  rise: number
  bake: number
}

export type TemperatureUnit = 'C' | 'F'
export type PlanningMode = 'forward' | 'backward'

// ── Layer 2: Execution status ────────────────────────────────────

export interface StepStatus {
  done: boolean
  doneAt: number | null
}

export interface RecipeStatus {
  started: boolean
  startedAt: number | null
  planningMode: PlanningMode
  forwardHour: number
  forwardMinute: number
  backwardDay: number
  backwardHour: number
  backwardMinute: number
  ambientTemp: number
  temperatureUnit: TemperatureUnit
  steps: Record<string, StepStatus>
}
