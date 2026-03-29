# PrepManager

> **File:** `commons/utils/prep-manager.ts`
> **Science:** No
> **Status:** Scaffold

## Purpose
Scaffold manager for the prep (ingredient preparation) layer. Provides per-subtype defaults from a hardcoded map and a warning stub that returns an empty array. Deep logic (yield calculations, timing) is deferred to future implementation.

## Philosophy
Pure functions only. No ScienceProvider injection -- this is a scaffold. The `getWarnings` function accepts config and subtype but returns `[]`. Designed to be replaced with full science-driven logic in the future.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `getDefaults` | `(subtype: string) => Partial<PrepMasterConfig>` | No | Returns per-subtype defaults. Subtypes: topping (yield 300g), filling (500g), garnish (100g), base (600g), marinade (400g), generic (500g). All default to 4 servings. |
| `getWarnings` | `(config: PrepMasterConfig, subtype: string) => ActionableWarning[]` | No | Stub -- always returns `[]`. |

## Warnings & i18n
No warnings are currently produced. When implemented, they must follow the `ActionableWarning` pattern with `messageKey` + `messageVars`.

## Dependencies
### Imports From
- `@commons/types/recipe-layers` (PrepMasterConfig)
- `@commons/types/recipe-graph` (ActionableWarning)

### Depended On By
- `tests/layer-subtypes.test.ts`

## How to Evolve
- Inject ScienceProvider as first parameter to all functions (breaking change to signature).
- Implement `getWarnings` with real rule evaluation: ingredient freshness, allergen flags, yield feasibility.
- Add `calcYield` for waste-adjusted output weight by ingredient type.
- Add `calcPrepTime` for duration estimation by technique and quantity.
- Consider merging with or delegating to `prep-layer-manager.ts` which already has ScienceProvider-based calculations.
