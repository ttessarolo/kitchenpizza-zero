# DoughManager

> **File:** `commons/utils/dough-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose

Centralized dough composition logic. Consolidates yeast calculation (Casucci Formula L via ScienceProvider), final dough temperature, composition metrics (salt/sugar/fat percentages), dough defaults per recipe type, and composition warnings via ScienceProvider rules. Acts as the high-level "dough brain" that depends on FlourManager for flour operations.

## Philosophy

Pure functions with ScienceProvider injection for all science-dependent calculations. Re-exports key FlourManager functions for backward compatibility. Warnings use `evaluateRules()` returning `RuleResult[]` with `messageKey` + `messageVars` (never hardcoded text). Dough defaults come from `local_data/dough-defaults`.

## Exported Functions

| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `calcYeastPct` | `(provider, hours, hydration?, tempC?, variantKey?, flourW?) => number` | Yes | Yeast % on flour via Formula L; optional W correction factor |
| `calcDurationFromYeast` | `(provider, yeastPct, hydration?, tempC?) => number` | Yes | Inverse Formula L: hours from yeast %, clamped 1-98 |
| `yeastGrams` | `(yeastPct, flourGrams) => number` | No | Convert yeast % to grams |
| `calcFinalDoughTemp` | `(flours, liquids, ambientTemp, frictionFactor) => number` | No | Weighted average temp with 15% air incorporation + friction |
| `computeSuggestedSalt` | `(totalFlour, hydration) => number` | No | Suggested salt grams: base 2.5% adjusted for hydration, clamped 2.0-3.0% |
| `getSaltPct` | `(salts, totalFlour) => number` | No | Salt % relative to flour |
| `getSugarPct` | `(sugars, totalFlour) => number` | No | Sugar % relative to flour |
| `getFatPct` | `(fats, totalFlour) => number` | No | Fat % relative to flour |
| `getDoughDefaults` | `(type, subtype) => DoughCompositionDefaults` | No | Defaults per recipe type/subtype with fallback chain |
| `getDoughWarnings` | `(provider, profile: DoughProfileInput) => RuleResult[]` | Yes | Composition warnings from Science rules (yeast, salt, fat, hydration ranges) |

## Re-exports

- From FlourManager: `getFlour`, `blendFlourProperties`, `estimateBlendW`, `estimateW`
- From RiseManager: `maxRiseHoursForW`
- From format: `rnd`
- Type: `RuleResult`, `DoughProfileInput`

## Science Integration

### Blocks Used

| Block ID | Type | Location |
|----------|------|----------|
| `yeast_pct` | formula | ScienceProvider.getFormula |
| `yeast_w_correction` | formula | ScienceProvider.getFormula |
| `yeast_duration_inverse` | formula | ScienceProvider.getFormula |
| `composition` | rules | ScienceProvider.getRules |

### How Science Flows

1. **Yeast calculation:** `calcYeastPct()` calls `evaluateFormula(provider.getFormula('yeast_pct'), { hours, tempC, hydration })` for base yeast %, then optionally applies `yeast_w_correction` formula for flour-W adjustment.
2. **Inverse yeast:** `calcDurationFromYeast()` uses `yeast_duration_inverse` formula.
3. **Warnings:** `getDoughWarnings()` merges the profile with dough defaults (salt/fat ranges) into a context object, then calls `evaluateRules(provider.getRules('composition'), ctx)`. Returns `RuleResult[]` with `messageKey` for i18n resolution.

## Key Formulas & Algorithms

- **Formula L (Casucci Cap. 44):** `L = K / (hydration * tempC^2 * hours)` -- base yeast %, with optional W correction multiplier
- **Inverse Formula L:** `D = K / (hydration * tempC^2 * yeastPct)` -- duration from yeast
- **Final Dough Temperature:** Weighted average of ingredient temps + 15% air at ambient + friction factor
- **Salt suggestion:** `base 2.5% + adjustment for high hydration`, clamped [2.0%, 3.0%]
- **Composition %:** `(ingredient_total / totalFlour) * 100`

## Warnings & i18n

`getDoughWarnings()` returns `RuleResult[]` where each result has `messageKey` and `messageVars`. The UI resolves these via `t(messageKey, messageVars)`. Covers: yeast ranges by duration, salt ranges by product type, fat ranges and inhibition thresholds, hydration extremes. References: [C] Cap. 44, 51, 53, 54.

## Dependencies

### Imports From
- `@commons/types/recipe` -- FlourIngredient, LiquidIngredient, SaltIngredient, SugarIngredient, FatIngredient
- `local_data/dough-defaults` -- DOUGH_COMPOSITION_DEFAULTS, DoughCompositionDefaults
- `./flour-manager` -- getFlour, blendFlourProperties, estimateBlendW, estimateW
- `./rise-manager` -- maxRiseHoursForW
- `./format` -- rnd
- `./science/science-provider` -- ScienceProvider (type)
- `./science/formula-engine` -- evaluateFormula
- `./science/rule-engine` -- evaluateRules, RuleResult

### Depended On By
- `app/server/services/graph-reconciler.service.ts` -- multiple imports (yeast, warnings, blending)
- `app/stores/recipe-flow-store.ts` -- getDoughDefaults, calcYeastPct, estimateBlendW
- `app/server/procedures/dough.ts`
- `commons/utils/recipe.ts` -- re-exports
- `commons/utils/yeast-calculator.ts` -- deprecated shim re-exports
- `tests/dough-manager.test.ts`, `tests/cookingsciencebrain.test.ts`, `tests/formula-engine.test.ts`, `tests/yeast-w-correction.test.ts`, `tests/warnings-advisories.test.ts`

## How to Evolve

- Add enriched dough logic (brioche, panettone) with staged fat addition modeling
- Add autolyse timing recommendations based on flour properties
- Expand warning rules for gluten-free and whole-grain compositions
