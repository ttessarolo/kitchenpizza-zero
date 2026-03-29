# PrepLayerManager

> **File:** `commons/utils/prep-layer-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose
Pure functions for the prep (ingredient preparation) layer. Covers food-safety room-temperature time limits by ingredient category, prep duration estimation based on cut style and quantity, and warning evaluation via ScienceProvider.

## Philosophy
All functions are pure. ScienceProvider is injected as the first parameter but currently only used by `getPrepWarnings`. The other functions use hardcoded lookup tables as their primary data source, with ScienceProvider reserved for future enhancement. No side effects, no DB access.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `calcSafeRoomTime` | `(provider, ingredientCategory, isCooked) => number` | No | Returns max safe minutes at room temperature. Cooked ingredients get 1.5x. Categories: protein (120), dairy (60), vegetable (240), grain (480), fruit (240). Default: 120. |
| `calcPrepDuration` | `(provider, cutStyle, quantityGrams) => number` | No | Estimates prep duration in minutes as `quantityGrams / gramsPerMinute`. Cut styles: julienne (80), brunoise (50), chiffonade (120), dice (100), slice (150), mince (60), rough (200). Default: 100. Minimum 1 minute. |
| `getPrepWarnings` | `(provider, profile) => RuleResult[]` | Yes | Evaluates all prep rules from `provider.getRules('prep')` via `evaluateRules`. |

## Science Integration
### Blocks Used
| Block ID | Type | Location |
|----------|------|----------|
| `prep` | Rules | `provider.getRules(...)` |

### How Science Flows
Only `getPrepWarnings` currently uses ScienceProvider, fetching the `'prep'` rule set and delegating to `evaluateRules`. The room time and duration functions use hardcoded constants but accept `_provider` for future integration.

## Key Formulas & Algorithms
- **Safe room time:** `baseTime * (isCooked ? 1.5 : 1.0)`. Base times per category from `SAFE_ROOM_TIME` map. Fallback: 120 min.
- **Prep duration:** `max(1, round(quantityGrams / gramsPerMinute))`. Speeds per cut style from `CUT_SPEED` map. Fallback: 100 g/min.

## Warnings & i18n
Warnings are produced by `evaluateRules` from the science rule engine. Each `RuleResult` contains `messageKey` + `messageVars` -- never hardcoded text.

## Dependencies
### Imports From
- `./science/science-provider` (ScienceProvider)
- `./science/rule-engine` (evaluateRules, RuleResult)

### Depended On By
- `tests/prep-manager.test.ts`

## How to Evolve
- Wire `calcSafeRoomTime` to ScienceProvider for per-category thresholds from JSON.
- Wire `calcPrepDuration` to ScienceProvider for cut-speed catalog entries.
- Add yield/waste calculations (e.g., peel waste % by ingredient type).
- Add cross-layer warnings (e.g., total prep room time vs. fermentation start window).
