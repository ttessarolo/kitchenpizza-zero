/**
 * LocalDataProvider — reads from local_data/ TypeScript files.
 *
 * This is the "mock DB" implementation of DataProvider.
 * When the data stabilizes, swap this for NeonDataProvider
 * without changing any consumer code.
 */

import type { DataProvider } from './data-provider'

import { FLOUR_CATALOG, FLOUR_GROUPS } from '@/local_data/flour-catalog'
import { FAT_TYPES } from '@/local_data/fat-catalog'
import { SALT_TYPES, SUGAR_TYPES } from '@/local_data/salt-sugar-catalog'
import { RISE_METHODS, YEAST_TYPES } from '@/local_data/rise-methods'
import { KNEAD_METHODS } from '@/local_data/knead-methods'
import { OVEN_TYPES, OVEN_MODES, MODE_MAP } from '@/local_data/oven-config'
import { TRAY_PRESETS, TRAY_MATERIALS } from '@/local_data/tray-presets'
import { LIQUID_PRESETS, EXTRA_PRESETS } from '@/local_data/ingredient-presets'
import { RECIPE_TYPES, RECIPE_SUBTYPES } from '@/local_data/recipe-types'
import { STEP_TYPES, COLOR_MAP } from '@/local_data/step-types'
import { BAKING_PROFILES } from '@/local_data/baking-profiles'
import { getDoughDefaults } from '@/local_data/dough-defaults'
import { RECIPE_LIST, getRecipeById } from '@/local_data/recipes'

export class LocalDataProvider implements DataProvider {
  getFlourCatalog() { return [...FLOUR_CATALOG] }
  getFlourGroups() { return FLOUR_GROUPS }
  getFatTypes() { return [...FAT_TYPES] }
  getSaltTypes() { return [...SALT_TYPES] }
  getSugarTypes() { return [...SUGAR_TYPES] }
  getRiseMethods() { return RISE_METHODS }
  getYeastTypes() { return YEAST_TYPES }
  getKneadMethods() { return KNEAD_METHODS }
  getOvenTypes() { return OVEN_TYPES }
  getOvenModes() { return OVEN_MODES }
  getModeMap() { return MODE_MAP }
  getTrayPresets() { return TRAY_PRESETS }
  getTrayMaterials() { return TRAY_MATERIALS }
  getLiquidPresetKeys() { return LIQUID_PRESETS }
  getExtraPresetKeys() { return EXTRA_PRESETS }
  getRecipeTypes() { return RECIPE_TYPES }
  getRecipeSubtypes(type: string) { return RECIPE_SUBTYPES[type] ?? [] }
  getStepTypes() { return STEP_TYPES }
  getColorMap() { return COLOR_MAP }
  getBakingProfiles() { return [...BAKING_PROFILES] }
  getDoughDefaults(type: string, subtype: string | null) { return getDoughDefaults(type, subtype) }
  getRecipeList() { return [...RECIPE_LIST] }
  getRecipe(id: string) { return getRecipeById(id) }
}
