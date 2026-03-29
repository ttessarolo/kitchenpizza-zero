# SauceManager

> **File:** `commons/utils/sauce-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose
Pure functions for sauce layer calculations. Covers reduction volume estimation after cooking, sauce duration estimation based on type/volume/method, and warning evaluation. All formulas are sourced from ScienceProvider JSON with built-in constant fallbacks.

## Philosophy
All functions are pure. ScienceProvider is injected as the first parameter for every function that needs science data. When the provider lacks a formula or catalog entry, hardcoded fallbacks ensure the manager never crashes. No side effects, no DB access.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `getDefaults` | `(subtype: string) => Partial<SauceMasterConfig>` | No | Returns per-subtype defaults (targetVolume, targetConsistency, shelfLife) from a hardcoded map. Subtypes: sugo, emulsione, pesto, crema, ragu, besciamella. |
| `calcReductionVolume` | `(provider, startVolume, cookDuration, lidUsed) => number` | Yes | Calculates final sauce volume (ml) after cooking/reduction. Uses `sauce_reduction_volume` formula or falls back to DEFAULT_EVAP_RATE. |
| `calcSauceDuration` | `(provider, sauceType, volume, method) => number` | Yes | Estimates cooking duration (minutes) from sauce_types catalog. Scales linearly by volume in liters, applies method multiplier (rapid: 0.6x, cold: flat 5 min). |
| `getSauceWarnings` | `(provider, profile) => RuleResult[]` | Yes | Evaluates all sauce rules from `provider.getRules('sauce')` via `evaluateRules`. |

## Science Integration
### Blocks Used
| Block ID | Type | Location |
|----------|------|----------|
| `sauce_reduction_volume` | Formula | `provider.getFormula(...)` |
| `sauce_types` | Catalog | `provider.getCatalog(...)` |
| `sauce` | Rules | `provider.getRules(...)` |

### How Science Flows
`calcReductionVolume` fetches the `sauce_reduction_volume` formula and evaluates it via `evaluateFormula` with `{ startVolume, cookDuration, lidFactor }`. On failure it falls back to a manual evaporation calculation using `DEFAULT_EVAP_RATE` (15% per 10 min) with a lid factor of 0.4. `calcSauceDuration` looks up `baseMinPerLiter` from the `sauce_types` catalog, then multiplies by volume and method factor. `getSauceWarnings` delegates entirely to `evaluateRules` with the `'sauce'` rule set.

## Key Formulas & Algorithms
- **Reduction fallback:** `loss = min(cookDuration * 0.15 * lidFactor / 100, 0.8)`, then `finalVolume = max(0, round(startVolume * (1 - loss)))`. Loss is capped at 80%.
- **Lid factor:** 0.4 when lid is used (60% evaporation reduction), 1.0 without lid.
- **Duration:** `baseMinPerLiter * (volume / 1000)`, then method multiplier. Minimum 1 minute.

## Warnings & i18n
Warnings are produced by `evaluateRules` from the science rule engine. Each `RuleResult` contains `messageKey` + `messageVars` -- never hardcoded text.

## Dependencies
### Imports From
- `@commons/types/recipe-layers` (SauceMasterConfig)
- `./science/science-provider` (ScienceProvider)
- `./science/rule-engine` (evaluateRules, RuleResult)
- `./science/formula-engine` (evaluateFormula)

### Depended On By
- `tests/sauce-manager.test.ts`
- `tests/layer-subtypes.test.ts`

## How to Evolve
- Add new subtypes to `SAUCE_SUBTYPE_DEFAULTS` as needed.
- Add science formulas for duration estimation (currently catalog-based linear).
- Extend `calcReductionVolume` with ingredient-specific evaporation modifiers.
- Add cross-layer warnings (e.g., sauce temperature vs. pastry stability).
