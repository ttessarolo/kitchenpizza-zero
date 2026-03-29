# IngredientManager

> **File:** `commons/utils/ingredient-manager.ts`
> **Science:** No
> **Status:** Complete

## Purpose

Centralized ingredient aggregation and grouping across all graph nodes. Groups ingredients by recipe group (e.g., "Impasto", "Cottura") and merges same-type ingredients within each group by summing grams. This powers shopping-list-style views and overview panels.

## Philosophy

Pure function, no ScienceProvider dependency. Takes a graph and a list of group names, returns a record of grouped ingredient arrays. Merging is by `type` field (for flours, liquids, yeasts, salts, sugars, fats) or by `name` field (for extras). CookingFats are folded into the fats array.

## Exported Functions

| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `computeGroupedIngredients` | `(graph: RecipeGraph, ingredientGroups: string[]) => Record<string, GroupedIngredients>` | No | Aggregate and merge ingredients across nodes, grouped by `node.data.group` |

## Exported Types

- `GroupedIngredients` -- { flours, liquids, extras, yeasts, salts, sugars, fats } arrays

## Warnings & i18n

No warnings produced. Pure aggregation only.

## Dependencies

### Imports From
- `@commons/types/recipe-graph` -- RecipeGraph
- `@commons/types/recipe` -- FlourIngredient, LiquidIngredient, ExtraIngredient, YeastIngredient, SaltIngredient, SugarIngredient, FatIngredient

### Depended On By
- `tests/ingredient-manager.test.ts`

## How to Evolve

- Add calorie/nutrition aggregation per group
- Support filtering by node type (only dough nodes, only cooking nodes, etc.)
- Add unit conversion for extras (e.g., "1 tsp" to grams)
