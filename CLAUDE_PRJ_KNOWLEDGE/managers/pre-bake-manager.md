# PreBakeManager

> **File:** `commons/utils/pre-bake-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose
Manages all pre-bake logic across 9 sub-types (boil, dock, flour_dust, oil_coat, steam_inject, brush, topping, scoring, generic). Provides default configs, science-driven validation and warnings, and contextual suggestions based on bake method.

## Philosophy
Pure functions only. ScienceProvider is injected into `validateConfig()` and `getWarnings()` for rule evaluation. Config fields are flattened into the rule context so science JSON rules can reference them directly. No DB, no side effects.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `getDefaultConfig` | `(subtype: string) => PreBakeConfig` | No | Default config for a pre-bake sub-type. Throws on unknown subtype. 5 sub-types have structured cfg, 4 have `cfg: null` |
| `validateConfig` | `(provider, subtype, config) => RuleResult[]` | Yes | Validate config against science rules. Flattens cfg fields + adds valid-enum flags into context |
| `getWarnings` | `(provider, preBakeCfg, recipeType, recipeSubtype, nextBakeSubtype) => RuleResult[]` | Yes | Advisory warnings. Context includes the next bake sub-type for cross-step coherence checks |
| `suggestPreBakeFor` | `(bakeSubtype: string) => string[]` | No | Suggests useful pre-bake sub-types for a given bake method (static lookup) |

## Science Integration
### Blocks Used
| Block ID | Type | Location |
|----------|------|----------|
| `pre_bake_validation` | Rules | `science/rules/pre_bake_validation.json` |
| `pre_bake` | Rules | `science/rules/pre_bake.json` |

### How Science Flows
**Validation:** Config fields are flattened into context alongside boolean validity flags (e.g., `liquidTempValid`, `toolValid`). Rules in `pre_bake_validation` fire on invalid combinations.

**Warnings:** Context includes `nodeType: 'pre_bake'`, `nodeSubtype`, `recipeType/Subtype`, `nextBakeSubtype`, and flattened config in `nodeData`. Rules in `pre_bake` produce advisory warnings (e.g., boil overcook, missing steam for bread).

## Warnings & i18n
All warnings come from `evaluateRules()` returning `RuleResult[]` with `messageKey` + `messageVars`. No hardcoded text in the manager.

## Dependencies
### Imports From
- `@commons/types/recipe` (PreBakeConfig, BoilConfig, DockConfig, FlourDustConfig, OilCoatConfig, SteamInjectConfig)
- `./science/science-provider` (ScienceProvider)
- `./science/rule-engine` (evaluateRules, RuleResult)

### Depended On By
- `tests/warnings-advisories.test.ts`

## How to Evolve
- Add new pre-bake sub-types: extend `ALL_SUBTYPES`, add case in `getDefaultConfig`, add valid-enum arrays if the sub-type has structured config, add entries in `SUGGESTIONS`.
- Add new science rules in `pre_bake_validation.json` or `pre_bake.json` referencing the flattened context fields.
- The `SUGGESTIONS` map is static; it could be made science-driven by adding a suggestions block.
