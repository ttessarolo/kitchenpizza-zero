# PastryManager

> **File:** `commons/utils/pastry-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose
Pure functions for pastry layer calculations. Covers chocolate tempering curve validation, custard pasteurization safety checks, meringue sugar-to-egg-white ratio stability, and warning evaluation via ScienceProvider.

## Philosophy
All functions are pure. ScienceProvider is injected as the first parameter. Some functions (custard, meringue) accept `_provider` but don't currently use it -- the parameter is kept for API consistency and future science integration. No side effects, no DB access.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `getDefaults` | `(subtype: string) => Partial<PastryMasterConfig>` | No | Returns per-subtype defaults (targetWeight, servings, temperatureNotes). Subtypes: cioccolato, crema, meringa, mousse, glassa, generic. |
| `validateTemperingCurve` | `(provider, chocolateType, meltTemp, coolTemp, workTemp) => { valid, warnings }` | Yes | Validates chocolate tempering by classifying workTemp into zones via `pastry_temper_zone` classification. Also checks melt > work and cool < work. |
| `checkCustardPasteurization` | `(provider, temp, duration, hasEggs) => { safe }` | No | Checks if custard reached 82C for at least 10 seconds. Returns safe=true if no eggs. |
| `calcMeringueRatio` | `(provider, eggWhiteG, sugarG) => { ratio, stable }` | No | Calculates sugar:egg-white ratio. Stable if ratio >= 1.5. |
| `getPastryWarnings` | `(provider, profile) => RuleResult[]` | Yes | Evaluates all pastry rules from `provider.getRules('pastry')` via `evaluateRules`. |

## Science Integration
### Blocks Used
| Block ID | Type | Location |
|----------|------|----------|
| `pastry_temper_zone` | Classification | `provider.getClassification(...)` |
| `pastry` | Rules | `provider.getRules(...)` |

### How Science Flows
`validateTemperingCurve` fetches the `pastry_temper_zone` classification and evaluates it via `evaluateClassification` with `{ workTemp }`. The classification returns a zone label (working_zone, too_cold, seeding_zone, over_tempered, melted). On failure, a manual fallback compares workTemp against `TEMPER_RANGES[chocolateType]`. Warnings are pushed as string keys (e.g., `'work_temp_too_cold'`).

## Key Formulas & Algorithms
- **Tempering ranges:** dark 31-32C, milk 29-30C, white 27-28C (workMin/workMax).
- **Custard pasteurization:** safe when `temp >= 82` AND `duration >= 10s`. Bypassed if `hasEggs === false`.
- **Meringue ratio:** `ratio = round((sugarG / eggWhiteG) * 100) / 100`. Stable when `ratio >= 1.5`.

## Warnings & i18n
`validateTemperingCurve` pushes zone-specific warning keys (`work_temp_too_cold`, `work_temp_in_seeding_zone`, `work_temp_over_tempered`, `work_temp_melted`, `melt_temp_below_work`, `cool_temp_above_work`). `getPastryWarnings` produces `RuleResult[]` with `messageKey` + `messageVars` via the rule engine.

## Dependencies
### Imports From
- `@commons/types/recipe-layers` (PastryMasterConfig)
- `./science/science-provider` (ScienceProvider)
- `./science/rule-engine` (evaluateRules, RuleResult)
- `./science/formula-engine` (evaluateClassification)

### Depended On By
- `tests/pastry-manager.test.ts`
- `tests/layer-subtypes.test.ts`

## How to Evolve
- Wire ScienceProvider into `checkCustardPasteurization` for temperature/duration thresholds from JSON.
- Wire ScienceProvider into `calcMeringueRatio` for meringue-type-specific stability thresholds (Italian/Swiss).
- Add new subtypes to `PASTRY_SUBTYPE_DEFAULTS`.
- Add cross-layer warnings (e.g., tempering temperature vs. ambient from fermentation layer).
