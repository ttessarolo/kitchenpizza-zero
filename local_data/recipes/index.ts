/**
 * Recipe registry — all local recipes with metadata for listing.
 * The main page reads RECIPE_LIST for the navigation.
 * Individual recipe data is loaded from recipe_N.ts files.
 */

import type { Recipe } from '@commons/types/recipe'
import { RECIPE_0 } from './recipe_0'
import { RECIPE_1 } from './recipe_1'
import { RECIPE_2 } from './recipe_2'
import { RECIPE_3 } from './recipe_3'
import { RECIPE_4 } from './recipe_4'
import { RECIPE_5 } from './recipe_5'

// Re-export individual recipes
export { RECIPE_0, RECIPE_1, RECIPE_2, RECIPE_3, RECIPE_4, RECIPE_5 }

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
]

/** Lookup recipe by ID. */
export const RECIPES: Record<string, Recipe> = {
  '0': RECIPE_0,
  '1': RECIPE_1,
  '2': RECIPE_2,
  '3': RECIPE_3,
  '4': RECIPE_4,
  '5': RECIPE_5,
}

/** Get a recipe by ID, fallback to RECIPE_1 (Shokupan). */
export function getRecipeById(id: string): Recipe {
  return RECIPES[id] ?? RECIPE_1
}
