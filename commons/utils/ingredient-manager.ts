/**
 * IngredientManager — Centralized ingredient aggregation and grouping.
 *
 * Owns:
 * - Grouped ingredient totals (per recipe group: "Impasto", "Cottura", etc.)
 * - Ingredient presets lookup
 */

import type {
  RecipeGraph,
  NodeData,
} from '@commons/types/recipe-graph'
import type {
  FlourIngredient,
  LiquidIngredient,
  ExtraIngredient,
  YeastIngredient,
  SaltIngredient,
  SugarIngredient,
  FatIngredient,
} from '@commons/types/recipe'

// ── Grouped ingredients ────────────────────────────────────────

export interface GroupedIngredients {
  flours: FlourIngredient[]
  liquids: LiquidIngredient[]
  extras: ExtraIngredient[]
  yeasts: YeastIngredient[]
  salts: SaltIngredient[]
  sugars: SugarIngredient[]
  fats: FatIngredient[]
}

/**
 * Aggregate ingredients by group across all graph nodes.
 * Same-type ingredients within a group are merged (grams summed).
 * CookingFats (frying oil, etc.) are included in fats.
 */
export function computeGroupedIngredients(
  graph: RecipeGraph,
  ingredientGroups: string[],
): Record<string, GroupedIngredients> {
  const g: Record<string, GroupedIngredients> = {}
  for (const grp of ingredientGroups) {
    g[grp] = { flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] }
  }

  for (const n of graph.nodes) {
    const gr = g[n.data.group]
    if (!gr) continue
    const d = n.data

    for (const f of d.flours) {
      const e = gr.flours.find((x) => x.type === f.type)
      if (e) e.g += f.g
      else gr.flours.push({ ...f })
    }
    for (const l of d.liquids) {
      const e = gr.liquids.find((x) => x.type === l.type)
      if (e) e.g += l.g
      else gr.liquids.push({ ...l })
    }
    for (const x of d.extras) {
      const e = gr.extras.find((z) => z.name === x.name)
      if (e) e.g += x.g
      else gr.extras.push({ ...x })
    }
    for (const y of d.yeasts ?? []) {
      const e = gr.yeasts.find((x) => x.type === y.type)
      if (e) e.g += y.g
      else gr.yeasts.push({ ...y })
    }
    for (const s of d.salts ?? []) {
      const e = gr.salts.find((x) => x.type === s.type)
      if (e) e.g += s.g
      else gr.salts.push({ ...s })
    }
    for (const s of d.sugars ?? []) {
      const e = gr.sugars.find((x) => x.type === s.type)
      if (e) e.g += s.g
      else gr.sugars.push({ ...s })
    }
    for (const f of d.fats ?? []) {
      const e = gr.fats.find((x) => x.type === f.type)
      if (e) e.g += f.g
      else gr.fats.push({ ...f })
    }
    // CookingFats (frying oil, etc.)
    for (const f of d.cookingFats ?? []) {
      const e = gr.fats.find((x) => x.type === f.type)
      if (e) e.g += f.g
      else gr.fats.push({ ...f })
    }
  }

  return g
}
