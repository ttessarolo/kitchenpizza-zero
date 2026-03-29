# BakeManager

> **File:** `commons/utils/bake-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose
Unified cooking logic for all 7 bake sub-types (forno, pentola, vapore, frittura, aria, griglia, padella). Provides profile lookup, default configs, duration calculation, config validation, fry-oil sync, and science-driven warnings.

## Philosophy
Pure functions only. ScienceProvider is injected into `getWarnings()` for rule evaluation. All other functions are stateless lookups or computations. No DB access, no side effects. Baking profiles come from `local_data/baking-profiles`.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `FRYABLE_FAT_KEYS` | `string[]` (constant) | No | Fat types suitable for frying, filtered from unified fat catalog |
| `getBakingProfile` | `(recipeType, recipeSubtype) => BakingProfile \| null` | No | Lookup best matching baking profile (exact subtype, then type-level fallback) |
| `getDefaultConfig` | `(subtype: string) => CookingConfig` | No | Default CookingConfig for a bake sub-type. Throws on unknown subtype |
| `calcDuration` | `(subtype, cookingCfg, recipeType, recipeSubtype, thickness) => number` | No | Calculate cooking duration in minutes using profile, temperature ratios, material factors, mode factors, and thickness |
| `validateConfig` | `(subtype, config) => string[]` | No | Validate CookingConfig against sub-type range constraints. Returns error strings (empty = valid) |
| `syncCookingFats` | `(cookingFats, fryConfig) => FatIngredient[]` | No | Auto-add default frying fat if cookingFats is empty and frying is active. Immutable return |
| `getWarnings` | `(provider, cookingCfg, recipeType, recipeSubtype, baseDur, nodeData) => RuleResult[]` | Yes | Evaluate science rules for all 7 cooking methods. Post-processes `steam_too_long` action for pentola/forno split |

## Science Integration
### Blocks Used
| Block ID | Type | Location |
|----------|------|----------|
| `baking` | Rules | `science/rules/baking.json` |

### How Science Flows
1. `getWarnings` builds a context object with cooking config, baking profile computed values (temp ranges, cielo ranges, recommended modes), and method-specific fields (oil temp, grill temp, etc.).
2. Context is passed to `evaluateRules(provider.getRules('baking'), ctx)`.
3. Post-processing adapts the `steam_too_long` rule's `addNodeAfter` mutation depending on whether the method is `pentola` (adds lidless browning phase) or `forno` (adds dry browning phase).

## Key Formulas & Algorithms

**Oven-based duration (forno/pentola):**
```
duration = baseTime * tempRatio * matFactor * modeFactor * thickFactor
```
- `tempRatio = profile.refTemp / max(ovenTemp, 100)`
- `matFactor = profile.materialFactors[panType]` (default 1.0)
- `modeFactor = 0.85` for fan mode, else 1.0
- `thickFactor = 1 + ((thickness - baseThickness) / 0.1) * profile.thicknessFactor`

**Frying duration:** `baseTime * (refTemp / oilTemp) * methodFactor` (shallow = 1.2x)

**Air fryer duration:** `baseTime * (refTemp / temp) + preheatDur`

**Grill duration:** `baseTime * (refTemp / directTemp) * fuelFactor` (charcoal = 1.1x)

**Pan duration:** `baseTime * (refTemp / temp) * materialFactor`

## Warnings & i18n
Warnings are produced via `evaluateRules()` which returns `RuleResult[]` with `messageKey` and `messageVars`. Never hardcoded text. The `steam_too_long` action labels use i18n keys (`action.split_steam_phases_pentola`).

## Dependencies
### Imports From
- `@commons/types/recipe` (OvenConfig, CookingConfig, FryConfig, etc.)
- `@commons/types/recipe-graph` (NodeData)
- `local_data/baking-profiles` (BAKING_PROFILES, BakingProfile)
- `local_data/fat-catalog` (FAT_TYPES)
- `./science/science-provider` (ScienceProvider)
- `./science/rule-engine` (evaluateRules, RuleResult)

### Depended On By
- `app/components/recipe/StepBody.tsx`
- `app/server/services/graph-reconciler.service.ts`
- `commons/utils/baking.ts`
- `tests/warnings-advisories.test.ts`

## How to Evolve
- Add new cooking sub-types by extending `COOKING_SUBTYPES`, adding a case in `getDefaultConfig`, `calcDuration`, `validateConfig`, and enriching `getWarnings` context.
- Add method-specific science rules in `baking.json` using `_cookingMethod` and `_cookingCfg` context fields.
- Baking profiles are data-driven: add new profiles in `local_data/baking-profiles` without code changes.
