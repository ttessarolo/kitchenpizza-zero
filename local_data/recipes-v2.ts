/**
 * Migrated v2 versions of local recipes.
 * These are generated from the v1 data at build time using migrateRecipeV1toV2.
 * Auto-layout positions are computed with dagre.
 */

import { migrateRecipeV1toV2 } from '@commons/utils/recipe-migration'
import { autoLayout } from '~/lib/auto-layout'
import { DEFAULT_RECIPE } from './default-recipe'
import { RECIPE_2 } from './recipe_2'
import { RECIPE_3 } from './recipe_3'

function migrate(recipe: typeof DEFAULT_RECIPE) {
  const v2 = migrateRecipeV1toV2(recipe)
  return { ...v2, graph: autoLayout(v2.graph) }
}

export const DEFAULT_RECIPE_V2 = migrate(DEFAULT_RECIPE)
export const RECIPE_2_V2 = migrate(RECIPE_2)
export const RECIPE_3_V2 = migrate(RECIPE_3)
