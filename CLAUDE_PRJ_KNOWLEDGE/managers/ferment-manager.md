# FermentManager

> **File:** `commons/utils/ferment-manager.ts`
> **Science:** No
> **Status:** Scaffold

## Purpose
Scaffold manager for the fermentation layer. Provides per-subtype defaults from a hardcoded map and a warning stub that returns an empty array. Deep logic (pH curves, salt ranges, temperature profiles) is deferred to future implementation.

## Philosophy
Pure functions only. No ScienceProvider injection -- this is a scaffold. The `getWarnings` function accepts config and subtype but returns `[]`. Designed to be replaced with full science-driven logic in the future.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `getDefaults` | `(subtype: string) => Partial<FermentMasterConfig>` | No | Returns per-subtype defaults. Subtypes: lattofermentazione (salt 2.5%, pH 4.0, 20C, 72h, jar), salamoia (5%, 3.8, 18C, 168h, crock), kombucha (0%, 2.5, 24C, 168h, jar), kefir (0%, 3.5, 22C, 24h, jar), miso (10%, 4.5, 25C, 4320h, crock), kimchi (3%, 3.5, 18C, 120h, jar). |
| `getWarnings` | `(config: FermentMasterConfig, subtype: string) => ActionableWarning[]` | No | Stub -- always returns `[]`. |

## Warnings & i18n
No warnings are currently produced. When implemented, they must follow the `ActionableWarning` pattern with `messageKey` + `messageVars`.

## Dependencies
### Imports From
- `@commons/types/recipe-layers` (FermentMasterConfig)
- `@commons/types/recipe-graph` (ActionableWarning)

### Depended On By
- `tests/layer-subtypes.test.ts`
- `app/stores/recipe-flow-store.ts`
- `commons/utils/recipe.ts`
- `tests/warnings-advisories.test.ts`

## How to Evolve
- Inject ScienceProvider as first parameter to all functions (breaking change to signature).
- Implement `getWarnings` with real rule evaluation: salt range checks, temperature safety, pH target feasibility.
- Add `calcFermentSchedule` for time/temperature planning.
- Add pH curve prediction based on temperature, salt, and ferment type.
- Consider merging with or delegating to `ferment-layer-manager.ts` which already has ScienceProvider-based calculations.
