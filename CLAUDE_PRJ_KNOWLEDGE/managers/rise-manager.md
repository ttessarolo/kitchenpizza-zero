# RiseManager

> **File:** `commons/utils/rise-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose

Centralized rise/fermentation duration logic. Calculates rise duration via a ScienceProvider factor chain (accounting for W, yeast, starch damage, falling number, fiber, salt, sugar, fat, temperature, and method), provides temperature factor modeling, rise method lookup, max rise hours for a given flour W, and rise-related warnings.

## Philosophy

Pure functions with ScienceProvider injection. Rise duration uses a multiplicative factor chain (each factor modifies a base duration). Temperature modeling uses a Q10-inspired exponential. Warnings come from `evaluateRules()` returning `RuleResult[]` with `messageKey`. Config data (rise methods, yeast types) comes from `local_data/rise-methods`.

## Exported Functions

| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `calcRiseDuration` | `(provider, inputs, catalogs?) => number` | Yes | Rise duration in minutes via factor chain from Science JSON |
| `riseTemperatureFactor` | `(fdt, riseMethod) => number` | No | Q10-inspired exponential: `2^(-(fdt-24)*coeff/10)` per method |
| `getRiseMethod` | `(key) => RiseMethod` | No | Lookup rise method by key, fallback to 'room' |
| `getAllRiseMethods` | `() => RiseMethod[]` | No | All available rise methods |
| `getYeastType` | `(key) => YeastType` | No | Lookup yeast type by key |
| `maxRiseHoursForW` | `(provider, W) => number` | Yes | Max room-temp rise hours before gluten degrades, via piecewise function |
| `getRiseWarnings` | `(provider, ctx) => RuleResult[]` | Yes | Warnings for rise config: duration vs W capacity, extremes, yeast compatibility |

## Re-exports

- `RISE_METHODS`, `YEAST_TYPES` from `local_data/rise-methods`
- Type: `RuleResult` from `./science/rule-engine`

## Science Integration

### Blocks Used

| Block ID | Type | Location |
|----------|------|----------|
| `rise_duration` | factorChain | ScienceProvider.getFactorChain |
| `max_rise_hours_for_W` | piecewise | ScienceProvider.getPiecewise |
| `rise` | rules | ScienceProvider.getRules |

### How Science Flows

1. **Duration:** `calcRiseDuration()` calls `evaluateFactorChain(provider.getFactorChain('rise_duration'), inputs, catalogs)`. The factor chain applies multiplicative factors for method, yeast, W, starch damage, falling number, fiber, yeast speed, temperature, and salt/sugar/fat inhibition.
2. **Max hours:** `maxRiseHoursForW()` calls `evaluatePiecewise(provider.getPiecewise('max_rise_hours_for_W'), { W })` -- a step function mapping W ranges to maximum safe hours.
3. **Warnings:** `getRiseWarnings()` enriches context with `_maxHoursForW`, then calls `evaluateRules(provider.getRules('rise'), ctx)`.

## Key Formulas & Algorithms

- **Temperature factor:** `2^(-(fdt - 24) * coeff / 10)` where coeff varies by method:
  - room: 1.0 (full effect)
  - ctrl18: 0.2 (mostly controlled)
  - ctrl12: 0.1 (heavily controlled)
  - fridge: 0.05 (nearly no FDT effect)
- **Factor chain:** Multiplicative composition: `base * factor_1 * factor_2 * ... * factor_n`
- **Max rise hours for W:** Piecewise function from [C] Cap. 44 table

## Warnings & i18n

`getRiseWarnings()` returns `RuleResult[]` with `messageKey` + `messageVars`. Covers: rise duration exceeding flour W capacity, extremely short or long durations, yeast type compatibility issues. References: [C] Cap. 24-31, 39, 44.

## Dependencies

### Imports From
- `@commons/types/recipe` -- RiseMethod
- `local_data/rise-methods` -- RISE_METHODS, YEAST_TYPES
- `./science/science-provider` -- ScienceProvider (type)
- `./science/formula-engine` -- evaluateFactorChain, evaluatePiecewise
- `./science/rule-engine` -- evaluateRules, RuleResult

### Depended On By
- `commons/utils/dough-manager.ts` -- maxRiseHoursForW (re-exported)
- `commons/utils/recipe.ts` -- calcRiseDuration, riseTemperatureFactor
- `app/server/services/graph-reconciler.service.ts` -- calcRiseDuration
- `app/server/procedures/rise.ts` -- calcRiseDuration, getAllRiseMethods, maxRiseHoursForW
- `tests/rise-manager.test.ts`, `tests/cookingsciencebrain.test.ts`, `tests/formula-engine.test.ts`, `tests/warnings-advisories.test.ts`

## How to Evolve

- Add multi-stage rise modeling (e.g., room then fridge)
- Add sourdough-specific rise curves (non-linear fermentation kinetics)
- Add ambient humidity factor for rise prediction
