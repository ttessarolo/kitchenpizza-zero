# RecipeAutoCorrectManager

> **File:** `commons/utils/recipe-auto-correct-manager.ts`
> **Science:** Yes (via GraphReconciler)
> **Status:** Complete

## Purpose
Iterative constraint solver for recipe graphs. Analyzes warnings from `reconcileGraph()`, prioritizes fixes by scientific tier, applies them iteratively via the graph mutation engine, verifies improvement after each step, and produces a structured report. Supports both analysis-only and auto-correct modes.

## Philosophy
Pure function (`autoCorrectGraph`) that orchestrates existing managers. Does not evaluate science rules directly -- delegates to `reconcileGraph()` for warning generation and `applyWarningActionPure()` for mutation application. The solver's own logic is the tier-based prioritization and iterative improvement loop. Scientific references: Casucci Cap. 31, 39, 44.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `autoCorrectGraph` | `(provider, graph, portioning, meta, config) => AutoCorrectResult` | Yes (indirect) | Iterative constraint solver. Loops up to `maxRounds`, each round: reconcile -> pick highest-tier actionable warning -> apply fix -> verify improvement. Returns updated graph + portioning + report |

## Warning Tier Classification
| Tier | Category | Warning Prefixes | Strategy |
|------|----------|-----------------|----------|
| 1 | Per-node structural | `flour_w_` | Fix first -- sets ceiling/floor on fermentation |
| 2 | Graph-level structural | `equivalent_time_exceeds`, `rise_phases_insufficient` | Aggregate constraints |
| 3 | Sync | `total_fermentation_mismatch`, `yeast_portioning_mismatch` | Often auto-resolved by Tier 1-2 |
| 4 | Sequence | `cold_rise_too_long`, `acclimatization_missing` | Independent, fix after 1-3 |
| 5 | Composition | (default for all others) | salt, fat, hydration, yeast range |

## Key Formulas & Algorithms

**Iterative solver loop:**
1. `reconcileGraph()` to get current warnings.
2. Filter to actionable, non-skipped, non-locked warnings (deduplicated by `messageKey`).
3. Sort by tier (lowest tier = highest priority).
4. Pick top warning, apply its first action via `applyWarningActionPure()`.
5. Re-reconcile to verify `afterCount < beforeCount`.
6. If no improvement, skip that warning ID and continue.
7. Repeat up to `maxRounds` (low=3, medium=5, high=8).

**Analysis mode:** When `config.autoCorrect === false`, records what WOULD be done without mutating the graph.

**Lock awareness:** Filters out warnings whose actions only contain locked mutations (respects `portioning.locks`).

## Warnings & i18n
The manager itself does not produce warnings. It consumes warnings from `reconcileGraph()` and records them in `AutoCorrectStep[]` with `messageKey` + `messageVars`. The report's `warningsRemaining` contains the final set of unresolved `ActionableWarning[]`.

## Dependencies
### Imports From
- `@commons/types/recipe-graph` (RecipeGraph, ActionableWarning)
- `@commons/types/recipe` (Portioning, RecipeMeta, DEFAULT_LOCKS)
- `@commons/types/auto-correct` (AutoCorrectConfig, AutoCorrectStep, AutoCorrectReport, AutoCorrectResult)
- `./science/science-provider` (ScienceProvider)
- `app/server/services/graph-reconciler.service` (reconcileGraph)
- `./graph-mutation-engine` (applyWarningActionPure, isLockedMutation)

### Depended On By
- `app/stores/recipe-flow-store.ts`
- `tests/recipe-auto-correct-manager.test.ts`

## How to Evolve
- Add new tier classifications by extending `TIER_PREFIXES`.
- Add multi-action support (currently applies only `actions[0]` of the top warning).
- Add rollback capability if a fix causes new higher-tier warnings.
- Add dry-run diff output for UI preview of proposed changes.
