export { RECIPE_TYPES, RECIPE_SUBTYPES } from './recipe-types'
export { TRAY_PRESETS, TRAY_MATERIALS } from './tray-presets'
export { FLOUR_CATALOG, FLOUR_GROUPS } from './flour-catalog'
export { LIQUID_PRESETS, EXTRA_PRESETS } from './ingredient-presets'
export { SALT_TYPES, SUGAR_TYPES } from './salt-sugar-catalog'
export { FAT_TYPES } from './fat-catalog'
export { RISE_METHODS, YEAST_TYPES } from './rise-methods'
export { OVEN_TYPES, OVEN_MODES, MODE_MAP } from './oven-config'
export { KNEAD_METHODS } from './knead-methods'
export { STEP_TYPES, COLOR_MAP } from './step-types'
export { BAKING_PROFILES } from './baking-profiles'
export type { BakingProfile } from './baking-profiles'

// ── Recipes — from local_data/recipes/ ────────────────────────
export {
  RECIPE_0, RECIPE_1, RECIPE_2, RECIPE_3, RECIPE_4, RECIPE_5,
  RECIPE_ML_MARGHERITA, RECIPE_ML_FUNGHI,
  DEFAULT_RECIPE, BASE_DOUGH_WEIGHT,
  RECIPE_LIST, RECIPES, getRecipeById,
  RECIPES_V3, getRecipeByIdV3,
  type RecipeListEntry,
} from './recipes'
export { DEFAULT_RECIPE_V2, RECIPE_2_V2, RECIPE_3_V2 } from './recipes/recipes-v2'

export { LLM_PROMPTS, DEFAULT_TEMPLATES } from './llm-prompts'
export type { LlmPromptEntry } from './llm-prompts'

export { PERIMETER_PRESETS, getActivePerimeter, getActivePresetKey, setActivePreset, updateActivePerimeter } from './llm-perimeter'
export type { LlmPerimeter } from './llm-perimeter'
