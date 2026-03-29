# FermentLayerManager

> **File:** `commons/utils/ferment-layer-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose
Pure functions for fermentation layer calculations. Covers brine salt concentration with safety checks, fermentation duration estimation based on temperature and salt, and warning evaluation. Uses ScienceProvider for piecewise duration lookup and rule evaluation.

## Philosophy
All functions are pure. ScienceProvider is injected as the first parameter. Duration estimation uses a piecewise lookup from ScienceProvider with a temperature-based fallback. No side effects, no DB access.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `calcBrineConcentration` | `(provider, saltG, vegetableG, waterG) => { pct, safe }` | No | Calculates salt percentage of total weight. Safe if pct >= 2%. |
| `calcFermentDuration` | `(provider, fermentType, tempC, saltPct) => { minDays, maxDays }` | Yes | Estimates fermentation duration range using `ferment_duration_by_temp` piecewise. Adjusts for salt above 3% (+10% per point). |
| `getFermentWarnings` | `(provider, profile) => RuleResult[]` | Yes | Evaluates all fermentation rules from `provider.getRules('ferment')` via `evaluateRules`. |

## Science Integration
### Blocks Used
| Block ID | Type | Location |
|----------|------|----------|
| `ferment_duration_by_temp` | Piecewise | `provider.getPiecewise(...)` |
| `ferment` | Rules | `provider.getRules(...)` |

### How Science Flows
`calcFermentDuration` fetches the `ferment_duration_by_temp` piecewise and evaluates it via `evaluatePiecewise` with `{ tempC }`. The result is `{ minDays, maxDays }`. On failure, a hardcoded temperature-band fallback is used (< 15C: 7-14d, 15-25C: 3-7d, > 25C: 2-5d). A salt adjustment multiplier is applied: for salt > 3%, each extra percentage point adds 10% to duration.

## Key Formulas & Algorithms
- **Brine concentration:** `pct = round((saltG / totalWeight) * 1000) / 10` (one decimal). Safe threshold: `MIN_SAFE_SALT_PCT = 2`.
- **Salt adjustment:** `saltAdjust = saltPct > 3 ? 1 + (saltPct - 3) * 0.1 : 1`. Applied to both minDays and maxDays.
- **Temperature fallback bands:** < 15C = 7-14 days, 15-25C = 3-7 days, > 25C = 2-5 days.

## Warnings & i18n
Warnings are produced by `evaluateRules` from the science rule engine. Each `RuleResult` contains `messageKey` + `messageVars` -- never hardcoded text.

## Dependencies
### Imports From
- `./science/science-provider` (ScienceProvider)
- `./science/rule-engine` (evaluateRules, RuleResult)
- `./science/formula-engine` (evaluatePiecewise)

### Depended On By
- `tests/ferment-layer-manager.test.ts`

## How to Evolve
- Add pH curve modeling based on temperature and time.
- Wire `calcBrineConcentration` to ScienceProvider for per-ferment-type safe thresholds.
- Add cross-layer warnings (e.g., fermentation temperature vs. prep room time limits).
- Add vessel-specific adjustments from science catalogs.
