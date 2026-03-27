/**
 * Migrated v2 versions of local recipes.
 * These are generated from the v1 data at build time using migrateRecipeV1toV2.
 * Auto-layout positions are computed with dagre.
 */

import { migrateRecipeV1toV2 } from '@commons/utils/recipe-migration'
import { autoLayout } from '~/lib/auto-layout'
import { RECIPE_1, RECIPE_2, RECIPE_3 } from './index'

function migrate(recipe: typeof RECIPE_1) {
  const v2 = migrateRecipeV1toV2(recipe)
  return { ...v2, graph: autoLayout(v2.graph) }
}

export const DEFAULT_RECIPE_V2 = migrate(RECIPE_1)
export const RECIPE_2_V2 = migrate(RECIPE_2)
export const RECIPE_3_V2 = migrate(RECIPE_3)
