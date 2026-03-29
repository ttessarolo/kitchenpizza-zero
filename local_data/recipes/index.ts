/**
 * Recipe registry — all local recipes with metadata for listing.
 * The main page reads RECIPE_LIST for the navigation.
 * Individual recipe data is loaded from recipe_N.ts files.
 */

import type { Recipe } from '@commons/types/recipe'
import type { RecipeV3 } from '@commons/types/recipe-layers'
import { RECIPE_0 } from './recipe_0'
import { RECIPE_1 } from './recipe_1'
import { RECIPE_2 } from './recipe_2'
import { RECIPE_3 } from './recipe_3'
import { RECIPE_4 } from './recipe_4'
import { RECIPE_5 } from './recipe_5'
import { RECIPE_ML_MARGHERITA } from './recipe_ml_margherita'
import { RECIPE_ML_FUNGHI } from './recipe_ml_funghi'

// Re-export individual recipes
export { RECIPE_0, RECIPE_1, RECIPE_2, RECIPE_3, RECIPE_4, RECIPE_5 }
export { RECIPE_ML_MARGHERITA, RECIPE_ML_FUNGHI }

// Backward compat
export { RECIPE_1 as DEFAULT_RECIPE }
export { BASE_DOUGH_WEIGHT } from './recipe_1'

// ── Recipe list metadata ───────────────────────────────────────

export interface RecipeListEntry {
  id: string
  name: string
  description: string
  type: string
  subtype: string
}

/** All available recipes, in display order. */
export const RECIPE_LIST: RecipeListEntry[] = [
  { id: '0', name: 'Nuova ricetta (vuota)', description: 'Parti da zero con un canvas vuoto', type: '', subtype: '' },
  { id: '1', name: 'Shokupan 食パン', description: 'Pane giapponese in cassetta con tangzhong', type: 'pane', subtype: 'shokupan' },
  { id: '2', name: 'Pane Casareccio con Biga', description: 'Pane rustico con prefermento biga al 80%', type: 'pane', subtype: 'pane_comune' },
  { id: '3', name: 'Pizza Bianca in Teglia alla Romana', description: 'Teglia romana ad alta idratazione', type: 'pizza', subtype: 'teglia_romana' },
  { id: '4', name: 'Treccia Bicolore Pomodoro e Basilico', description: 'Treccia con poolish e split/join', type: 'pane', subtype: 'pane_comune' },
  { id: '5', name: 'Pizza Margherita Napoletana', description: 'Pizza classica con lievitazione lunga in frigo', type: 'pizza', subtype: 'napoletana' },
  { id: 'ml_margherita', name: 'Pizza Margherita (Multi-layer)', description: '3 layer: Impasto, Sugo, Assemblaggio', type: 'pizza', subtype: 'napoletana' },
  { id: 'ml_funghi', name: 'Pizza ai Funghi Misti (Multi-layer)', description: '4 layer: Impasto Poolish, Sugo, Funghi, Assemblaggio', type: 'pizza', subtype: 'napoletana' },
]

/** Lookup recipe by ID (v1 only). */
export const RECIPES: Record<string, Recipe> = {
  '0': RECIPE_0,
  '1': RECIPE_1,
  '2': RECIPE_2,
  '3': RECIPE_3,
  '4': RECIPE_4,
  '5': RECIPE_5,
}

/** Get a v1 recipe by ID, fallback to RECIPE_1 (Shokupan). */
export function getRecipeById(id: string): Recipe {
  return RECIPES[id] ?? RECIPE_1
}

// ── V3 (multi-layer) recipes ────────────────────────────────────

/** Lookup v3 recipes by ID. */
export const RECIPES_V3: Record<string, RecipeV3> = {
  'ml_margherita': RECIPE_ML_MARGHERITA,
  'ml_funghi': RECIPE_ML_FUNGHI,
}

/** Get a v3 recipe by ID, or null if not found. */
export function getRecipeByIdV3(id: string): RecipeV3 | null {
  return RECIPES_V3[id] ?? null
}
