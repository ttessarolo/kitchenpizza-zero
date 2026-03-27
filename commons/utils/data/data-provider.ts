/**
 * DataProvider — abstract interface for accessing catalog/config data.
 *
 * Today: LocalDataProvider reads from local_data/ TypeScript files.
 * Future: NeonDataProvider reads from PostgreSQL via Neon driver.
 *
 * All translatable strings are stored as i18n keys (labelKey),
 * resolved by the client via useT(). The DataProvider never
 * returns resolved text — only keys.
 */

import type {
  FlourCatalogEntry,
  RiseMethod,
  YeastType,
  KneadMethod,
  OvenTypeEntry,
  OvenModeEntry,
  TrayPreset,
  TrayMaterial,
  RecipeTypeEntry,
  RecipeSubtypeEntry,
  StepTypeEntry,
  ColorMapEntry,
  Recipe,
} from '@commons/types/recipe'
import type { BakingProfile } from '@/local_data/baking-profiles'
import type { SaltType, SugarType } from '@/local_data/salt-sugar-catalog'
import type { FatType } from '@/local_data/fat-catalog'
import type { RecipeListEntry } from '@/local_data/recipes'

export interface DataProvider {
  // ── Catalogs ──────────────────────────────────────────────────
  getFlourCatalog(): FlourCatalogEntry[]
  getFlourGroups(): readonly string[]
  getFatTypes(): FatType[]
  getSaltTypes(): SaltType[]
  getSugarTypes(): SugarType[]
  getRiseMethods(): readonly RiseMethod[]
  getYeastTypes(): readonly YeastType[]
  getKneadMethods(): readonly KneadMethod[]
  getOvenTypes(): readonly OvenTypeEntry[]
  getOvenModes(): readonly OvenModeEntry[]
  getModeMap(): Record<string, string[]>
  getTrayPresets(): readonly TrayPreset[]
  getTrayMaterials(): readonly TrayMaterial[]
  getLiquidPresetKeys(): readonly string[]
  getExtraPresetKeys(): readonly string[]

  // ── Type enums ────────────────────────────────────────────────
  getRecipeTypes(): readonly RecipeTypeEntry[]
  getRecipeSubtypes(type: string): RecipeSubtypeEntry[]
  getStepTypes(): StepTypeEntry[]
  getColorMap(): Record<string, ColorMapEntry>

  // ── Config (no i18n) ──────────────────────────────────────────
  getBakingProfiles(): BakingProfile[]
  getDoughDefaults(type: string, subtype: string | null): {
    defaultDoughHours: number
    saltPctDefault: number
    saltPctRange: [number, number]
    fatPctDefault: number
    fatPctRange: [number, number]
  } | undefined

  // ── Recipes ───────────────────────────────────────────────────
  getRecipeList(): RecipeListEntry[]
  getRecipe(id: string): Recipe
}
