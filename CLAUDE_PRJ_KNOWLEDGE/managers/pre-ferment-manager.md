# PreFermentManager

> **File:** `commons/utils/pre-ferment-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose

Centralized pre-ferment logic for biga, poolish, lievito madre (solid and liquid). Computes pre-ferment ingredient allocation (flour, water, yeast) from total dough weight and config, validates against available resources via ScienceProvider rules, recalculates step ingredients from config, and adjusts the linked dough step's flour/water to be the remainder.

## Philosophy

Pure functions with ScienceProvider injection for validation only. Ingredient calculation is formula-driven (no Science dependency). The key invariant is that pre-ferment flour + water + yeast are carved from the recipe's total -- the dough step receives the remainder. Uses `rnd()` for consistent rounding.

## Exported Functions

| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `computePreFermentAmounts` | `(totalDough, cfg: PreFermentConfig) => { pfWeight, pfFlour, pfWater, pfYeast }` | No | Allocate pre-ferment ingredients from total dough and config percentages |
| `validatePreFerment` | `(provider, cfg, totalFlour, totalLiquid, totalDough) => RuleResult[]` | Yes | Validate config against available flour/liquid (1% tolerance) |
| `recalcPreFermentIngredients` | `(step: RecipeStep, totalDough) => RecipeStep` | No | Rebuild step's flours/liquids/yeasts arrays from its preFermentCfg |
| `adjustDoughForPreFerment` | `(steps, preFermentId, target, targetHyd) => RecipeStep[]` | No | Set dough step flour/water to remainder after pre-ferment allocation |
| `reconcilePreFerments` | `(recipe: Recipe) => Recipe` | No | Full reconciliation: recalculate all pre-ferment steps and adjust dough steps |

## Internal Functions

- `getDescendantIds(stepId, steps) => Set<string>` -- BFS to find descendant steps (used to locate the linked dough step)

## Science Integration

### Blocks Used

| Block ID | Type | Location |
|----------|------|----------|
| `pre_ferment` | rules | ScienceProvider.getRules |

### How Science Flows

`validatePreFerment()` computes the pre-ferment amounts, builds a context with `preFermentPct`, `hydrationPct`, `pfFlour`, `pfWater`, and allowances (totalFlour * 1.01, totalLiquid * 1.01), then calls `evaluateRules(provider.getRules('pre_ferment'), ctx)`. Returns empty array if valid.

## Key Formulas & Algorithms

- **Pre-ferment weight:** `totalDough * (preFermentPct / 100)`
- **Pre-ferment flour:** `pfWeight / (1 + hydrationPct/100 + yeastRatio)` -- solves the equation pfFlour + pfWater + pfYeast = pfWeight
- **Pre-ferment water:** `pfFlour * (hydrationPct / 100)`
- **Pre-ferment yeast:** `pfFlour * yeastRatio` (zero for madre types)
- **Dough remainder:** `targetFlour = target / (1 + targetHyd/100)`, then `remainingFlour = targetFlour - pfFlour`
- **Reference hydrations:** Biga ~44%, Poolish ~100%, Madre solido ~50%, Licoli ~100%

## Warnings & i18n

`validatePreFerment()` returns `RuleResult[]` with `messageKey` + `messageVars`. Checks that pre-ferment flour/water do not exceed available totals (with 1% tolerance margin).

## Dependencies

### Imports From
- `@commons/types/recipe` -- RecipeStep, Recipe, PreFermentConfig
- `./format` -- rnd
- `./science/science-provider` -- ScienceProvider (type)
- `./science/rule-engine` -- evaluateRules, RuleResult

### Depended On By
- `app/stores/recipe-flow-store.ts` -- multiple imports
- `commons/utils/recipe.ts` -- re-exports
- `tests/warnings-advisories.test.ts` -- validatePreFerment

## How to Evolve

- Add multi-stage pre-ferment support (e.g., refreshed madre with multiple builds)
- Add temperature-aware pre-ferment timing (cold biga vs room-temp biga)
- Add auto-suggestion for pre-ferment % based on recipe type and desired flavor profile
