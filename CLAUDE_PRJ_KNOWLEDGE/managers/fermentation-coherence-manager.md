# FermentationCoherenceManager

> **File:** `commons/utils/fermentation-coherence-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose
Cross-node fermentation validation. Ensures rise phases in the recipe graph are coherent with each other, with portioning settings (doughHours, yeastPct), and with flour W properties. Central concept is "equivalent room-temperature hours" which normalizes all rise phases to a common scale.

## Philosophy
Pure functions with ScienceProvider injection. All scientific formulas and piecewise lookups come from the provider. The manager computes derived values (equivalent hours, mismatches, sequence checks) and feeds them into the rule engine. No DB, no side effects. Scientific references: Casucci Cap. 31, 39, 44.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `calcEquivalentRoomHours` | `(phases: RisePhaseInfo[]) => number` | No | Convert rise phases to equivalent room-temperature hours. Each phase: `(baseDur/60) / tf` |
| `validateFermentationCoherence` | `(provider, phases, doughProps, portioning, graphContext) => RuleResult[]` | Yes | Full cross-node validation: time vs doughHours mismatch, flour W limits, fridge wall-clock max, acclimatization check, yeast% mismatch |
| `suggestPhaseRedistribution` | `(targetEquivHours, currentPhases) => { nodeId, newBaseDur }[]` | No | Redistribute non-overridden rise phases to match target equivalent hours. Preserves user-overridden phases |
| `suggestYeastPct` | `(provider, equivalentRoomHours, tempC?, hydration?) => number` | Yes | Suggest yeast% for given equivalent hours using Formula L |

## Exported Types
| Type | Description |
|------|-------------|
| `RisePhaseInfo` | `{ nodeId, title, riseMethod, baseDur, tf, userOverride }` |

## Science Integration
### Blocks Used
| Block ID | Type | Location |
|----------|------|----------|
| `fermentation_coherence` | Rules | `science/rules/fermentation_coherence.json` |
| `min_fermentation_hours_for_W` | Piecewise | Science JSON |
| `max_rise_hours_for_W` | Piecewise | Science JSON |
| `yeast_pct` | Formula | Science JSON (Formula L) |

### How Science Flows
1. `calcEquivalentRoomHours` normalizes all rise phases: `sum((baseDur/60) / tf)`.
2. `validateFermentationCoherence` computes:
   - `minHoursForW` and `maxHoursForW` via piecewise lookups on flour W.
   - `mismatchPct` between equivalent hours and portioning `doughHours`.
   - `maxFridgeWallHours` from fridge-method phases.
   - `fridgeFollowedByBake` by scanning node sequence for fridge->bake without room-temp acclimatization.
   - `expectedYeastPct` via Formula L, then `yeastMismatchPct` vs actual.
3. All computed values are fed as context to `evaluateRules('fermentation_coherence')`.
4. `suggestYeastPct` directly evaluates Formula L: `K / (hyd * tempC^2 * hours)`.

## Key Formulas & Algorithms

**Equivalent room hours:** `sum((baseDur_i / 60) / tf_i)` where tf is the rise method's time factor (room=1, fridge=3.6, etc.)

**Mismatch %:** `|equivalentRoomHours - doughHours| / doughHours * 100`

**Phase redistribution:** Scale factor = `remainingEquiv / currentAdjustableEquiv`, applied to each non-overridden phase's `baseDur`. Minimum 15 minutes.

**Acclimatization check:** Scans node sequence for a fridge rise directly followed by bake/pre_bake without an intervening room-temp rise.

## Warnings & i18n
All warnings via `evaluateRules()` returning `RuleResult[]` with `messageKey` + `messageVars`. Context variables like `equivalentRoomHours`, `doughHours`, `flourW`, `fridgeNodeTitle` are passed as `messageVars` for interpolation. No hardcoded text.

## Dependencies
### Imports From
- `./science/science-provider` (ScienceProvider)
- `./science/rule-engine` (evaluateRules, RuleResult)
- `./science/formula-engine` (evaluateFormula, evaluatePiecewise)

### Depended On By
- `app/server/services/graph-reconciler.service.ts`
- `tests/fermentation-coherence.test.ts`

## How to Evolve
- Add new rise methods by extending the `RisePhaseInfo.riseMethod` union and ensuring corresponding `tf` values are provided.
- Add new coherence rules in `fermentation_coherence.json` using the rich context (all `_`-prefixed computed values are available).
- Add pre-ferment phase support by including pre-ferment nodes in `RisePhaseInfo[]`.
