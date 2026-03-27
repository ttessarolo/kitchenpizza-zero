// ── Catalog entry types ──────────────────────────────────────────

export interface RecipeTypeEntry {
  key: string
  labelKey: string
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
  labelKey: string
  defaults: RecipeSubtypeDefaults
}

export interface TrayPreset {
  key: string
  labelKey: string
  l: number
  w: number
  h: number
  material: string
  griglia: boolean
}

export interface TrayMaterial {
  key: string
  labelKey: string
  bMin: number
  bMax: number
  defTemp: number
  hasVent: boolean  // whether this material supports a vent hole (e.g. cassette with lid)
}

export interface FlourCatalogEntry {
  key: string
  groupKey: string
  labelKey: string
  subKey: string
  protein: number
  W: number
  PL: number
  absorption: number
  ash: number
  fiber: number
  starchDamage: number
  fermentSpeed: number
  fallingNumber: number
}

export interface RiseMethod {
  key: string
  labelKey: string
  tf: number
}

export interface YeastType {
  key: string
  labelKey: string
  toFresh: number
  speedF: number
  hasFW: boolean
}

export interface OvenTypeEntry {
  key: string
  labelKey: string
}

export interface OvenModeEntry {
  key: string
  labelKey: string
}

export interface KneadMethod {
  key: string
  labelKey: string
  ff: number
}

export interface StepSubtypeDefaults {
  baseDur?: number
  riseMethod?: string
  kneadMethod?: string
  liquidTemp?: number
  flourPctOfLiquid?: number
  flourPctOfLiquidMax?: number
  hydrationPct?: number
  useMainDoughFlour?: boolean
  // Pre-ferment fields
  phases?: number
  preFermentPct?: number
  preFermentPctRange?: [number, number]
  hydrationPctRange?: [number, number]
  hydrationLocked?: boolean
  yeastType?: string | null
  yeastPct?: number | null
  yeastPctRange?: [number, number]
  fermentTemp?: number
  fermentTempRange?: [number, number]
  fermentDur?: number
  fermentDurRange?: [number, number]
  roomTempDur?: number
  roomTempRange?: [number, number]
  roomTemp?: number
  phaseDescriptionKeys?: string[]
  starterForms?: string[]
  maxAgeDays?: number
}

export interface StepSubtypeEntry {
  key: string
  labelKey: string
  defaults: StepSubtypeDefaults
}

export interface StepTypeEntry {
  key: string
  labelKey: string
  icon: string
  subtypes?: StepSubtypeEntry[]
}

export interface ColorMapEntry {
  bg: string
  tx: string
  lbKey: string
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
  // Dough composition profile (global settings)
  doughHours: number    // desired dough duration (1-98 hours)
  yeastPct: number      // % fresh yeast on flour
  saltPct: number       // % salt on flour
  fatPct: number        // % fat on flour
  // Pre-techniques (used by "Genera Impasto" to build the node graph)
  preImpasto: string | null   // null | "tangzhong" | "autolisi"
  preFermento: string | null  // null | "biga" | "poolish" | "sponge" | "idrobiga" | "sourdough" | "old_dough"
}

export interface RecipeMeta {
  name: string
  author: string
  type: string
  subtype: string
  /** Language of the user-written text (name, step titles, descriptions). */
  locale: string
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

export interface SaltIngredient {
  id: number
  type: string
  g: number
}

export interface SugarIngredient {
  id: number
  type: string
  g: number
}

export interface FatIngredient {
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
  shelfPosition: number
  /** Steam percentage (0-100). Only relevant when ovenMode === 'steam'. */
  steamPct?: number
  /** Whether the Dutch oven lid is on. Only relevant for pentola. Default: true. */
  lidOn?: boolean
}

// ── Cooking configs (per bake sub-type) ─────────────────────────

export interface SteamerConfig {
  steamerType: 'bamboo' | 'electric' | 'pot_basket'
  temp: number
  lidLift: boolean
  waterLevel: 'full' | 'half'
  paperLiner: boolean
}

export interface FryConfig {
  fryMethod: 'deep' | 'shallow'
  oilTemp: number
  flipHalf: boolean
  maxDoughWeight: number
}

export interface AirFryerConfig {
  temp: number
  preheat: boolean
  preheatDur: number
  oilSpray: boolean
  flipHalf: boolean
  basketType: 'drawer' | 'oven_style' | 'dual_zone'
  capacity: 'small' | 'standard' | 'large'
}

export interface GrillConfig {
  grillType: 'charcoal' | 'gas'
  directTemp: number
  indirectTemp: number
  twoZone: boolean
  lidClosed: boolean
  oilSpray: boolean
  flipOnce: boolean
  dockDough: boolean
}

export interface PanConfig {
  panMaterial: 'cast_iron' | 'nonstick' | 'steel'
  panSize: number
  temp: number
  oilSpray: boolean
  flipOnce: boolean
  lidUsed: boolean
}

export type CookingConfig =
  | { method: 'forno'; cfg: OvenConfig }
  | { method: 'pentola'; cfg: OvenConfig }
  | { method: 'vapore'; cfg: SteamerConfig }
  | { method: 'frittura'; cfg: FryConfig }
  | { method: 'aria'; cfg: AirFryerConfig }
  | { method: 'griglia'; cfg: GrillConfig }
  | { method: 'padella'; cfg: PanConfig }

// ── Pre-bake configs (per pre_bake sub-type) ────────────────────

export interface BoilConfig {
  liquidType: 'water_malt' | 'water_honey' | 'water_sugar' | 'lye_solution' | 'baking_soda'
  liquidTemp: number
  additivePct: number
  flipOnce: boolean
  drainTime: number
}

export interface DockConfig {
  tool: 'fork' | 'docker_roller' | 'skewer'
  pattern: 'uniform' | 'center_only' | 'edge_sparing'
}

export interface FlourDustConfig {
  flourType: 'rice' | 'semolina' | 'tipo00' | 'rye' | 'cornmeal'
  application: 'surface' | 'base_only' | 'all_over'
}

export interface OilCoatConfig {
  oilType: 'olive' | 'canola' | 'peanut' | 'sunflower' | 'avocado'
  method: 'spray' | 'brush' | 'drizzle'
  surface: 'top' | 'bottom' | 'both'
}

export interface SteamInjectConfig {
  method: 'water_pan' | 'ice_cubes' | 'spray_bottle' | 'steam_injection'
  waterVolume: 'small' | 'medium' | 'large'
  removeAfter: number
}

export type PreBakeConfig =
  | { method: 'boil'; cfg: BoilConfig }
  | { method: 'dock'; cfg: DockConfig }
  | { method: 'flour_dust'; cfg: FlourDustConfig }
  | { method: 'oil_coat'; cfg: OilCoatConfig }
  | { method: 'steam_inject'; cfg: SteamInjectConfig }
  | { method: 'brush'; cfg: null }
  | { method: 'topping'; cfg: null }
  | { method: 'scoring'; cfg: null }
  | { method: 'generic'; cfg: null }

export interface PreFermentConfig {
  preFermentPct: number
  hydrationPct: number
  yeastType: string | null
  yeastPct: number | null
  fermentTemp: number | null
  fermentDur: number | null
  roomTempDur: number | null
  starterForm: string | null
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
  subtype: string | null
  group: string
  baseDur: number
  restDur: number
  restTemp: number | null
  deps: StepDep[]
  kneadMethod: string | null
  desc: string
  flours: FlourIngredient[]
  liquids: LiquidIngredient[]
  extras: ExtraIngredient[]
  yeasts: YeastIngredient[]
  salts: SaltIngredient[]
  sugars: SugarIngredient[]
  fats: FatIngredient[]
  riseMethod: string | null
  /** @deprecated Use cookingCfg instead. Kept for backward compatibility. */
  ovenCfg: OvenConfig | null
  cookingCfg?: CookingConfig | null
  preBakeCfg?: PreBakeConfig | null
  /** Fats used for cooking (frying, pan, etc.) — NOT counted in dough totals. */
  cookingFats?: FatIngredient[]
  sourcePrep: string | null
  shapeCount: number | null
  preFermentCfg: PreFermentConfig | null
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
  PL: number
  absorption: number
  ash: number
  fiber: number
  starchDamage: number
  fermentSpeed: number
  fallingNumber: number
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
