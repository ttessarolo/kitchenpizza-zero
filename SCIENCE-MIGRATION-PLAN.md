# Science Migration Plan: From Hardcoded Logic to Neon DB

## Objective

Refactor all TypeScript managers so that **every piece of scientific logic** is read from the Neon PostgreSQL database (`science_blocks` table) via a `DbScienceProvider`, eliminating all hardcoded scientific constants, formulas, thresholds, and defaults from TypeScript source code.

After this migration, managers become **pure orchestrators** — they build context, call the ScienceProvider, and return results. They contain **zero** domain-specific scientific values.

---

## Architecture Overview

### Current State
```
Manager (TypeScript)
├── Hardcoded constants (fallback values)
├── Tries ScienceProvider (FileScienceProvider reads local JSON)
└── Falls back to hardcoded if provider unavailable
```

### Target State
```
Manager (TypeScript)
├── NO hardcoded scientific values
├── Uses DbScienceProvider (reads from Neon science_blocks table)
└── Provider is ALWAYS available (required dependency, not optional)
```

### Key Principle
**ScienceProvider is no longer optional.** Every manager function that currently accepts `provider?: ScienceProvider` must change to `provider: ScienceProvider` (required). The `try/catch { fallback }` pattern is eliminated — if the provider fails, that's an application error, not a silent fallback to hardcoded values.

---

## Neon Database Details

- **Project:** `tiny-scene-15818370` (cooking-science-brain)
- **Region:** eu-central-1
- **Table:** `science_blocks`
- **Columns:** `id` (text PK), `type` (text), `domain` (text), `data` (jsonb), `description` (text), `version` (int), `status` (text), `source` (text), `source_id` (text), `created_at` (timestamptz), `updated_at` (timestamptz)
- **Total blocks:** 48 (was 46 — 2 formula-array rows were split into 4 individual rows)
- **Expression format:** All mathematical expressions use **MathJSON** (CortexJS standard) — JSON arrays. Evaluated by `@cortex-js/compute-engine`. LaTeX auto-generated via `.latex` property for UI rendering (KaTeX).
- **Structural rule:** Every row contains exactly ONE block (`data` is a JSON object). Exception: `rule/*` rows contain arrays of rules (batch evaluation with suppression chains).
- **Connection:** Use Neon serverless driver (`@neondatabase/serverless`) — already in the project for other DB operations.

---

## Step 1: Create DbScienceProvider

**File:** `commons/utils/science/db-science-provider.ts`

Implement the `ScienceProvider` interface (defined in `commons/utils/science/science-provider.ts`) backed by Neon.

### Design Requirements

1. **Single query on init** — Load all `science_blocks` where `status = 'active'` into memory maps (same pattern as `FileScienceProvider.loadAll()`).
2. **Block ID mapping** — The row `id` column (e.g., `formula/suggested-salt`) is the primary key. Formula/catalog/defaults/classification rows have `data` as a single JSON object. Rule rows have `data` as an array of rules — flatten these into individual rule entries indexed by their inner `id`. No formula-arrays exist anymore (they were split into individual rows).
3. **Index by type** — Same indexes as `FileScienceProvider`: blocks by id, rules by domain, catalogs by id.
4. **Cache invalidation** — For v1, load once at startup. Add a `reload()` method for future use.
5. **i18n** — Read from `science_i18n` table: `SELECT key, value FROM science_i18n WHERE locale = $1`.
6. **MathJSON evaluation** — Use `@cortex-js/compute-engine` to evaluate MathJSON expressions. Register custom functions: `Clamp(val, min, max)`. The Compute Engine replaces `expr-eval` entirely.
7. **LaTeX generation** — Use the Compute Engine `.latex` property on boxed expressions. Store as render cache or generate on-the-fly for UI display via KaTeX.

### SQL Queries

```sql
-- Load all active science blocks
SELECT id, type, domain, data FROM science_blocks WHERE status = 'active';

-- Load i18n keys for a locale
SELECT key, value FROM science_i18n WHERE locale = $1;
```

### Implementation Skeleton

```typescript
import { neon } from '@neondatabase/serverless';
import type { ScienceProvider } from './science-provider';
import type { ScienceBlock, FormulaBlock, FactorChainBlock, PiecewiseBlock, ClassificationBlock, RuleBlock } from './types';

export class DbScienceProvider implements ScienceProvider {
  private blocks: Map<string, ScienceBlock> = new Map();
  private rulesByDomain: Map<string, RuleBlock[]> = new Map();
  private catalogs: Map<string, Record<string, unknown>[]> = new Map();
  private i18nCache: Map<string, Record<string, string>> = new Map();
  private sql: ReturnType<typeof neon>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async init(): Promise<void> {
    const rows = await this.sql`SELECT id, type, domain, data FROM science_blocks WHERE status = 'active'`;
    this.blocks.clear();
    this.rulesByDomain.clear();
    this.catalogs.clear();

    for (const row of rows) {
      const data = row.data;
      if (row.type === 'rule' && Array.isArray(data)) {
        // Rules are arrays — flatten into individual rule entries
        for (const rule of data) {
          this.blocks.set(rule.id, rule);
          const domain = rule._meta?.section ?? row.domain;
          if (!this.rulesByDomain.has(domain)) this.rulesByDomain.set(domain, []);
          this.rulesByDomain.get(domain)!.push(rule);
        }
      } else {
        // All other types: data is a single object (one block per row)
        const block = data as any;
        this.blocks.set(row.id, block);
        if (row.type === 'catalog') {
          this.catalogs.set(row.id, block.entries);
        }
      }
    }
  }

  // ... implement all ScienceProvider methods identically to FileScienceProvider
  // The only difference is the data source (DB rows instead of JSON files)
}
```

### Important: Async Initialization

`DbScienceProvider` requires an async `init()` call. This must happen **once** at server startup (e.g., in the oRPC middleware or server bootstrap). The provider instance is then passed synchronously to all managers — the same pattern as today with `FileScienceProvider`.

---

## Step 2: Update ScienceBlock Types

**File:** `commons/utils/science/types.ts`

Add the two new block types that are now in the database:

### 2a. BlendFormulaBlock

```typescript
/** 8. Blend formula — weighted property aggregation */
export interface BlendFormulaBlock {
  type: 'blend_formula'
  id: string
  _meta?: BlockMeta
  blendMethod: 'weighted_average'  // extensible for future methods
  weightField: string               // field name for weight (e.g., 'g')
  sourceField: string               // field name for catalog lookup key (e.g., 'type')
  sourceCatalog: string             // catalog id to look up source properties
  properties: {
    field: string
    round: number
    default?: number
  }[]
  fallbackDefaults: string          // id of defaults block for empty-input case
  estimateBlendW?: {
    method: 'equal_weight_average'
    field: string
    fallback: number
  }
}
```

### 2b. MultiNodeConstraintBlock

```typescript
/** 9. Multi-node constraint — cross-node validation with S→P→A→V pattern */
export interface MultiNodeConstraintBlock {
  type: 'multi_node_constraint'
  id: string
  _meta?: BlockMeta
  selector: {
    nodeFilter: Record<string, unknown>
    contextSources: { from: string; fields: string[] }[]
  }
  projection: {
    perNode: {
      fields: string[]
      lookup?: Record<string, { catalog: string; key: string; field: string }>
    }
  }
  aggregation: {
    computations: {
      id: string
      description: string
      formula: string
      round?: number
      requiresPositive?: string
      algorithm?: string
    }[]
  }
  validation: {
    rulesDomain: string
    contextMapping: Record<string, string>
  }
  adaptationStrategies?: Record<string, unknown>
}
```

### 2c. Update the Union Type

```typescript
export type ScienceBlock =
  | FormulaBlock
  | FactorChainBlock
  | PiecewiseBlock
  | ClassificationBlock
  | RuleBlock
  | CatalogBlock
  | DefaultsBlock
  | BlendFormulaBlock
  | MultiNodeConstraintBlock
```

### 2d. Add Provider Methods

In `ScienceProvider` interface, add:

```typescript
getBlendFormula(id: string): BlendFormulaBlock
getMultiNodeConstraint(id: string): MultiNodeConstraintBlock
```

---

## Step 3: Refactor Each Manager

### 3a. bake-manager.ts

**Current hardcoded logic to remove:**

| Location | What | Now in Neon |
|---|---|---|
| `getDefaultConfig()` switch statement | 7 cooking method defaults | `defaults/cooking-configs` (id: `cooking_config_defaults`) |
| `calcDuration()` factor maps | `modeFactors`, `steamerFactors`, `fryMethodFactors`, `fuelFactors` | `catalog/cooking-factors` (id: `cooking_factors`) |
| `validateConfig()` ranges | Temp ranges per method (vapore 95-105, frittura 170-195, etc.) | `defaults/cooking-validation-ranges` (id: `cooking_validation_ranges`) |
| `syncCookingFats()` amounts | `deepAmount=500`, `shallowAmount=150` | `defaults/frying-amounts` |
| `getWarnings()` post-processing | steam_too_long pentola/forno configs | `defaults/steam-split-configs` (id: `steam_split_phase_configs`) |

**Refactoring instructions:**

1. **`getDefaultConfig(subtype, provider)`** — Remove the entire switch statement. The function becomes:
   ```typescript
   export function getDefaultConfig(subtype: string, provider: ScienceProvider): CookingConfig {
     const d = provider.getDefaults('cooking_config_defaults', subtype, null);
     if (!d || d.method == null || d.cfg == null) {
       throw new Error(`No cooking config defaults found for subtype: ${subtype}`);
     }
     return { method: d.method as string, cfg: d.cfg } as CookingConfig;
   }
   ```

2. **`calcDuration()`** — Remove all hardcoded factor maps. Read from provider:
   ```typescript
   const factors = provider.getBlock('cooking_factors') as any;
   const modeFactors = factors.modeFactor;
   const steamerFactors = factors.steamerFactor;
   // etc.
   ```
   Make `provider` required (not optional).

3. **`validateConfig()`** — Read validation ranges from provider:
   ```typescript
   export function validateConfig(subtype: string, config: CookingConfig, provider: ScienceProvider): string[] {
     const ranges = provider.getDefaults('cooking_validation_ranges', subtype, null);
     // Use ranges.tempMin, ranges.tempMax, etc. instead of hardcoded values
   }
   ```

4. **`syncCookingFats()`** — Read amounts from provider (already partially done, just remove hardcoded fallbacks).

5. **`getWarnings()`** — Read steam split configs from provider (`steam_split_phase_configs`) instead of hardcoding pentola/forno defaults. Remove hardcoded `_oilTempMin: 170, _oilTempMax: 195`.

6. **Remove `BAKING_PROFILES` import** — Baking profiles are in Neon (`catalog/baking-profiles`). Change `getBakingProfile()` to read from provider:
   ```typescript
   export function getBakingProfile(provider: ScienceProvider, recipeType: string, recipeSubtype: string | null): BakingProfile | null {
     const catalog = provider.getCatalog('baking_profiles') as BakingProfile[];
     const exact = catalog.find(p => p.type === recipeType && p.subtype === recipeSubtype);
     return exact ?? catalog.find(p => p.type === recipeType && p.subtype === null) ?? null;
   }
   ```

---

### 3b. rise-manager.ts

**Current hardcoded logic to remove:**

| Location | What | Now in Neon |
|---|---|---|
| `riseTemperatureFactor()` fallback | Q10 coefficients `{room:1, ctrl18:0.2, ctrl12:0.1, fridge:0.05}`, baseline=24 | `catalog/rise-methods` (entries have `q10Coeff` field) |
| `RISE_METHODS` import | Rise method data from local_data | `catalog/rise-methods` |
| `YEAST_TYPES` import | Yeast type data from local_data | Part of `catalog/ferment-types` |

**Refactoring instructions:**

1. **`riseTemperatureFactor()`** — Remove the null-provider fallback. Make provider required:
   ```typescript
   export function riseTemperatureFactor(provider: ScienceProvider, fdt: number, riseMethod: string): number {
     const catalog = provider.getCatalog('rise_methods') as any[];
     const entry = catalog.find(e => e.key === riseMethod);
     const coeff = entry?.q10Coeff ?? 1;
     const baseline = 24; // could also be stored in catalog metadata
     return Math.pow(2, (-(fdt - baseline) * coeff) / 10);
   }
   ```

2. **Remove `RISE_METHODS` / `YEAST_TYPES` imports from local_data** — Replace with provider reads where used. Functions like `getRiseMethod()` and `getYeastType()` should read from provider.

---

### 3c. flour-manager.ts

**Current hardcoded logic to remove:**

| Location | What | Now in Neon |
|---|---|---|
| `blendFlourProperties()` empty fallback | `{protein:12, W:280, PL:0.55, ...}` | `defaults/flour-blend-fallback` (id: `flour_blend_fallback`) |
| `blendFlourProperties()` algorithm | Hardcoded weighted average loop | `formula/blend-flour` (id: `blend_flour_properties`) — declarative spec |
| `estimateW()` fallback | `22*protein-70` clamped [60,420] | `formula/composition` (id: `estimate_W_from_protein`) |
| `isWholeGrain()` | `fiber > 6` | `defaults/flour-blend-fallback` → `wholeGrainThreshold` |
| `isGlutenFree()` | `W === 0 && fermentSpeed === 0` | `defaults/flour-blend-fallback` → `glutenFreeCondition` |
| `FLOUR_CATALOG` import | Flour data from local_data | `catalog/flours` |
| `estimateBlendW()` fallback | Default W=280 | `formula/blend-flour` → `estimateBlendW.fallback` |

**Refactoring instructions:**

1. **`blendFlourProperties()`** — Read the blend formula spec from provider to get the list of properties and their rounding. Read fallback defaults from `flour_blend_fallback`. The blending algorithm itself (weighted average) can remain in TypeScript — the formula spec tells it WHAT to blend, not HOW (the how is always weighted average for now):
   ```typescript
   export function blendFlourProperties(
     provider: ScienceProvider,
     flours: FlourIngredient[],
   ): BlendedFlourProps {
     const blendSpec = provider.getBlendFormula('blend_flour_properties');
     const catalog = provider.getCatalog(blendSpec.sourceCatalog);

     if (flours.length === 0 || totalWeight === 0) {
       const fallback = provider.getDefaults(blendSpec.fallbackDefaults, 'empty_blend', null);
       return fallback as BlendedFlourProps;
     }
     // ... weighted average using blendSpec.properties
   }
   ```

2. **`isWholeGrain()`** — Read threshold from provider:
   ```typescript
   export function isWholeGrain(flour: FlourCatalogEntry, provider: ScienceProvider): boolean {
     const block = provider.getBlock('flour_blend_fallback') as any;
     const threshold = block?.wholeGrainThreshold?.value ?? 6;
     return flour.fiber > threshold;
   }
   ```

3. **Remove `FLOUR_CATALOG` import** — Replace with `provider.getCatalog('flours')`.

4. **`estimateW()`** — Remove hardcoded fallback. Make provider required.

---

### 3d. pastry-manager.ts

**Current hardcoded logic to remove:**

| Location | What | Now in Neon |
|---|---|---|
| `PASTRY_SUBTYPE_DEFAULTS` | 6 subtype configs | `defaults/pastry-types` (id: `pastry_subtype_defaults`) |
| `TEMPER_RANGES` | Chocolate tempering ranges | `defaults/pastry-types` → `temperRanges` |
| `CUSTARD_SAFE_TEMP` / `CUSTARD_MIN_DURATION_S` | 82°C / 10s | `defaults/pastry-types` → `custard` |
| `MERINGUE_STABLE_RATIO` | 1.5 | `defaults/pastry-types` → `meringue` |

**Refactoring instructions:**

This manager is **mostly already migrated** — it tries the provider first and falls back to hardcoded constants. The refactoring is:

1. Remove all `const` declarations for `PASTRY_SUBTYPE_DEFAULTS`, `TEMPER_RANGES`, `CUSTARD_SAFE_TEMP`, `CUSTARD_MIN_DURATION_S`, `MERINGUE_STABLE_RATIO`.
2. Make `provider` required in all functions (remove `?`).
3. Remove all `try/catch { fallback }` blocks — read directly from provider.
4. The provider reads `getDefaults('pastry_subtype_defaults', ...)` and `getBlock('pastry_subtype_defaults')` which already work against Neon data.

---

### 3e. sauce-manager.ts

**Current hardcoded logic to remove:**

| Location | What | Now in Neon |
|---|---|---|
| `DEFAULT_EVAP_RATE` / `LID_FACTOR` | 0.15 / 0.4 | `defaults/sauce-evaporation` (id: `sauce_evaporation_constants`) |
| `SAUCE_SUBTYPE_DEFAULTS` | 6 subtype configs | `defaults/sauce-types` (id: `sauce_subtype_defaults`) |

**Refactoring instructions:**

1. Remove `DEFAULT_EVAP_RATE` and `LID_FACTOR` constants.
2. `calcReductionVolume()` — Read evaporation constants from provider. The `sauce_reduction_volume` formula already exists in Neon; for the fallback path, read constants from `sauce_evaporation_constants`:
   ```typescript
   export function calcReductionVolume(provider: ScienceProvider, startVolume: number, cookDuration: number, lidUsed: boolean): number {
     const evapBlock = provider.getDefaults('sauce_evaporation_constants', 'evaporation_model', null) as any;
     const evapRate = evapBlock.evapRatePer10Min;
     const lidDampening = lidUsed ? evapBlock.lidDampeningFactor : 1.0;
     // Use formula from provider
     return evaluateFormula(provider.getFormula('sauce_reduction_volume'), { startVolume, cookDuration, lidFactor: lidDampening });
   }
   ```
3. Remove `SAUCE_SUBTYPE_DEFAULTS` — already reads from provider.
4. Make `provider` required everywhere.

---

### 3f. dough-manager.ts

**Current hardcoded logic to remove:**

| Location | What | Now in Neon |
|---|---|---|
| `calcFinalDoughTemp()` airPct fallback | 0.15 | `formula/dough-temp` → `constants.airIncorporationPct` |
| `computeSuggestedSalt()` fallback values | basePct=2.5, adjFactor=0.01, etc. | `formula/composition` (id: `suggested_salt`) |
| `getDoughDefaults()` import | `DOUGH_COMPOSITION_DEFAULTS` from local_data | `defaults/dough` (id: `dough_composition_defaults`) |

**Refactoring instructions:**

1. **`calcFinalDoughTemp()`** — Remove optional provider, make required. Read airIncorporationPct from formula constants:
   ```typescript
   const formula = provider.getFormula('final_dough_temp');
   const airPct = formula.constants?.airIncorporationPct ?? 0.15;
   ```
   Actually, this should just call `evaluateFormula()` instead of reimplementing the weighted average.

2. **`computeSuggestedSalt()`** — Remove hardcoded fallbacks. Use provider directly:
   ```typescript
   export function computeSuggestedSalt(provider: ScienceProvider, totalFlour: number, hydration: number): number {
     return evaluateFormula(provider.getFormula('suggested_salt'), { totalFlour, hydration });
   }
   ```

3. **`getDoughDefaults()`** — Read from provider instead of local_data:
   ```typescript
   export function getDoughDefaults(provider: ScienceProvider, type: string, subtype: string | null): DoughCompositionDefaults {
     return provider.getDefaults('dough_composition_defaults', type, subtype) as DoughCompositionDefaults;
   }
   ```

4. Remove `DOUGH_COMPOSITION_DEFAULTS` import from `local_data/dough-defaults`.

---

### 3g. fermentation-coherence-manager.ts

**This is the most significant refactoring.** The entire file implements a multi-node constraint that is now declaratively described in Neon (`constraint/fermentation-coherence`).

**Current hardcoded logic to remove:**

The entire orchestration: `calcEquivalentRoomHours`, `validateFermentationCoherence` (context building, acclimatization detection), `suggestPhaseRedistribution`, `suggestYeastPct`.

**Refactoring approach:**

The multi_node_constraint block in Neon describes the WHAT (selector, projection, aggregation, validation). The TypeScript code implements the HOW. The refactoring should:

1. **Read the constraint spec from provider** to determine what to compute.
2. **Keep the computation logic in TypeScript** but parameterize it from the spec.
3. **Remove all hardcoded values** — read from the constraint block.

```typescript
export function validateFermentationCoherence(
  provider: ScienceProvider,
  phases: RisePhaseInfo[],
  doughProps: { flourW: number; yeastPct: number },
  portioning: { doughHours: number; yeastPct: number },
  graphContext: { nodeSequence: NodeSequenceEntry[] },
): RuleResult[] {
  // Read the constraint specification
  const constraint = provider.getMultiNodeConstraint('fermentation_coherence_constraint');

  // Aggregation: compute all derived values as specified
  const equivalentRoomHours = calcEquivalentRoomHours(phases); // pure math, no hardcoded values

  // Use piecewise functions from provider (already done today)
  const minHoursForW = evaluatePiecewise(provider.getPiecewise('min_fermentation_hours_for_W'), { W: doughProps.flourW });
  const maxHoursForW = evaluatePiecewise(provider.getPiecewise('max_rise_hours_for_W'), { W: doughProps.flourW });

  // Expected yeast from provider formula (already done today)
  const expectedYeastPct = evaluateFormula(provider.getFormula('yeast_pct'), {
    hours: equivalentRoomHours,
    tempC: constraint.adaptationStrategies?.suggestion?.defaults?.tempC ?? 24,
    hydration: constraint.adaptationStrategies?.suggestion?.defaults?.hydration ?? 56,
  });

  // ... build context and evaluate rules (same pattern as today)
  return evaluateRules(provider.getRules(constraint.validation.rulesDomain), ctx);
}
```

For `suggestPhaseRedistribution()`, read the `minBaseDur` from the constraint's `adaptationStrategies.parametric` instead of hardcoding `15`.

For `suggestYeastPct()`, read defaults from `adaptationStrategies.suggestion.defaults`.

---

## Step 4: Remove local_data Dependencies

After all managers read from the provider, the following `local_data/` files become unused and should be deleted:

- `local_data/baking-profiles.ts` → replaced by `catalog/baking-profiles` in Neon
- `local_data/rise-methods.ts` → replaced by `catalog/rise-methods` in Neon
- `local_data/dough-defaults.ts` → replaced by `defaults/dough` in Neon
- `local_data/fat-catalog.ts` → replaced by `catalog/fats` in Neon
- `local_data/flour-catalog.ts` → replaced by `catalog/flours` in Neon

**Note:** Some of these files may also be imported by UI components (e.g., for dropdown options). Those imports must also be redirected to the provider. If UI components need catalog data, they should receive it from the server via oRPC procedures, not import local files directly.

---

## Step 5: Wire DbScienceProvider into the Server

**File:** `app/server/middleware/science.ts` (new)

```typescript
import { DbScienceProvider } from '@commons/utils/science/db-science-provider';

let provider: DbScienceProvider | null = null;

export async function getScienceProvider(): Promise<DbScienceProvider> {
  if (!provider) {
    provider = new DbScienceProvider(process.env.NEON_CSB_DATABASE_URL!);
    await provider.init();
  }
  return provider;
}
```

**Integration points:**
- oRPC middleware: inject provider into context, available to all procedures
- `graph-reconciler-v2.service.ts`: receives provider from the procedure that calls it
- All managers: receive provider as first or explicit parameter

**Environment variable:** Add `NEON_CSB_DATABASE_URL` to `.env` — this is the connection string for the `cooking-science-brain` Neon project (separate from the main app DB).

---

## Step 6: Update graph-reconciler-v2.service.ts

The graph reconciler currently creates a `FileScienceProvider` instance. Change it to accept a `ScienceProvider` parameter (dependency injection):

```typescript
// Before:
const scienceProvider = new FileScienceProvider(scienceDir, i18nDir);

// After:
// Provider is passed in from the calling procedure
export async function reconcileGraph(provider: ScienceProvider, ...) { ... }
```

---

## Neon Science Blocks Inventory (48 total)

> **Expression format:** All `expr` fields use MathJSON (JSON arrays). Evaluated by `@cortex-js/compute-engine`. LaTeX auto-generated for UI rendering.
> **Structural rule:** Each row = one block (`data` is object). Exception: `rule/*` rows = array of rules.

### Catalogs (10)
| DB id | Domain | Description |
|---|---|---|
| catalog/baking-profiles | bake | Baking profiles per type/subtype |
| catalog/cooking-factors | bake | Mode, steamer, fry, fuel factors |
| catalog/fats | dough | Fat types with ferment effect, smoke point |
| catalog/ferment-types | ferment | Fermentation type catalog |
| catalog/flours | dough | Flour catalog with all properties |
| catalog/oven-config | bake | Oven configuration options |
| catalog/pastry-types | pastry | Pastry type catalog |
| catalog/rise-methods | dough | Rise methods with tf and q10Coeff |
| catalog/salts-sugars | dough | Salt and sugar type catalog |
| catalog/sauce-types | sauce | Sauce type catalog with baseMinPerLiter |

### Formulas (12 — each row = 1 formula, no arrays)
| DB id | Type | Domain | Description |
|---|---|---|---|
| formula/bake-duration-oven | factor_chain | bake | Factor chain for oven/pentola bake duration |
| formula/blend-flour | blend_formula | dough | Weighted average of flour properties for multi-flour dough |
| formula/dough-temp | formula | dough | FDT with airIncorporationPct |
| formula/estimate-w-from-protein | formula | dough | Linear regression W from protein % |
| formula/ferment-duration | piecewise | ferment | Fermentation duration by temp |
| formula/rise-duration | factor_chain | dough | 11-factor chain for rise duration |
| formula/rise-temp-factor | formula | dough | Q10 exponential temp factor for fermentation speed |
| formula/sauce-reduction | formula | sauce | Sauce reduction volume formula |
| formula/suggested-salt | formula | dough | Salt grams from flour weight + hydration |
| formula/yeast | formula | dough | Formula L (Casucci Cap. 44) |
| formula/yeast-inverse | formula | dough | Inverse Formula L |
| formula/yeast-w-correction | formula | dough | W correction for yeast |

### Classifications (4)
| DB id | Inner id | Domain |
|---|---|---|
| classification/flour-strength | flour_strength | dough |
| classification/min-fermentation-hours | min_fermentation_hours | ferment |
| classification/pastry-temper | pastry_temper_zone | pastry |
| classification/rise-capacity | max_rise_hours_for_W | dough |

### Defaults (9)
| DB id | Inner id | Domain | Description |
|---|---|---|---|
| defaults/cooking-configs | cooking_config_defaults | bake | 7 method defaults |
| defaults/cooking-validation-ranges | cooking_validation_ranges | bake | **NEW** — Temp/size ranges |
| defaults/dough | dough_composition_defaults | dough | 21 type/subtype defaults |
| defaults/ferment-types | ferment_type_defaults | ferment | Ferment type defaults |
| defaults/flour-blend-fallback | flour_blend_fallback | dough | **NEW** — Empty blend + thresholds |
| defaults/frying-amounts | frying_amounts | bake | Deep/shallow oil amounts |
| defaults/pastry-types | pastry_subtype_defaults | pastry | 6 subtypes + temper + custard + meringue |
| defaults/prep-types | prep_type_defaults | prep | Prep type defaults |
| defaults/sauce-evaporation | sauce_evaporation_constants | sauce | **NEW** — Evap rate + lid factor |
| defaults/sauce-types | sauce_subtype_defaults | sauce | 6 subtype defaults |
| defaults/steam-split-configs | steam_split_phase_configs | bake | **NEW** — Steam split mutation configs |

### Rules (10)
| DB id | Domain | Rule count |
|---|---|---|
| rule/baking-advisories | bake | 23 |
| rule/dough-warnings | dough | 14 |
| rule/ferment-warnings | ferment | 5 |
| rule/fermentation-coherence | ferment | 6 |
| rule/pastry-warnings | pastry | 5 |
| rule/pre-bake-advisories | bake | 9 |
| rule/pre-ferment-validation | ferment | 6 |
| rule/prep-warnings | prep | 3 |
| rule/rise-warnings | dough | 2 |
| rule/sauce-warnings | sauce | 4 |

### Constraints (1)
| DB id | Inner id | Domain | Description |
|---|---|---|---|
| constraint/fermentation-coherence | fermentation_coherence_constraint | ferment | **NEW** — Multi-node constraint spec |

---

## Migration Checklist

### MathJSON Migration (COMPLETED 2026-04-03)
- [x] Install `@cortex-js/compute-engine` — replaces `expr-eval`
- [x] Create MathJSON evaluator in FormulaEngine (Compute Engine + custom `Clamp` function)
- [x] Update `types.ts` — `expression: string` → `expr: MathJSON` + `latex: string` across FormulaBlock, FormulaVariant, FactorDef, PiecewiseSegment, MultiNodeConstraintBlock
- [x] Rewrite `formula-engine.ts` — uses `@cortex-js/compute-engine` instead of `expr-eval`
- [x] Export `mathJSONToLatex()` helper and `computeEngine` instance
- [x] Convert all 21 expr-eval strings in Neon `science_blocks` to MathJSON arrays + LaTeX
- [x] Convert all local `/science/formulas/*.json` to MathJSON format
- [x] Update JSON schema (`cookingsciencebrain.schema.json`) for MathJSON
- [x] Update admin UI (`rules.$id.tsx`) — `.expression` → `.expr` + LaTeX display
- [x] Update manager references (`flour-manager.ts` `.expression` → `.expr`)
- [x] Update test file (`formula-engine.test.ts`) — all inline test data uses MathJSON
- [x] Remove `expr-eval` from `package.json`

### DbScienceProvider (COMPLETED prior)
- [x] Create `DbScienceProvider` class (reads MathJSON expressions natively)
- [x] Add `BlendFormulaBlock` and `MultiNodeConstraintBlock` to types.ts
- [x] Add `getBlendFormula()` and `getMultiNodeConstraint()` to ScienceProvider interface
- [x] Create science middleware (`getScienceProvider()`)
- [x] Add `NEON_CSB_DATABASE_URL` to .env

### Manager Refactoring (pending)
- [ ] Refactor `bake-manager.ts` — remove all hardcoded values, make provider required
- [ ] Refactor `rise-manager.ts` — remove Q10 fallbacks, remove local_data imports
- [ ] Refactor `flour-manager.ts` — remove blend fallbacks, flour catalog import, thresholds
- [ ] Refactor `pastry-manager.ts` — remove all constant declarations and try/catch fallbacks
- [ ] Refactor `sauce-manager.ts` — remove evaporation constants and subtype defaults
- [ ] Refactor `dough-manager.ts` — remove local_data imports, make provider required everywhere
- [ ] Refactor `fermentation-coherence-manager.ts` — read constraint spec from provider

### Wiring & Cleanup (pending)
- [ ] Update `graph-reconciler-v2.service.ts` to accept provider via DI
- [ ] Update all oRPC procedures to pass provider to managers
- [ ] Redirect UI catalog imports to server-provided data via oRPC
- [ ] Delete unused `local_data/` files
- [ ] Add LaTeX rendering component (`FormulaDisplay`) using KaTeX for Science admin panel
- [ ] Run all existing tests and fix any broken ones
- [ ] Verify the full recipe editing flow works end-to-end

---

## Testing Strategy

1. **Unit tests** — For each refactored manager, write tests that mock `DbScienceProvider` with known data and verify outputs match the current hardcoded behavior exactly.
2. **Integration test** — Connect to a Neon test branch, load the full science corpus, and run the graph reconciler on a sample recipe graph.
3. **Regression check** — Compare warning outputs before and after migration for a set of representative recipe configurations.

---

## Notes

- The `FileScienceProvider` should NOT be deleted — it remains useful for local development, tests, and as a reference implementation.
- The `local_data/` files should be kept temporarily (but unused) until the migration is verified in production, then deleted in a follow-up PR.
- i18n keys referenced in science blocks use the dual-field pattern: `label` (Italian text for LLM) + `labelKey` (i18n key resolved via `science_i18n` table on Neon or `commons/i18n/{locale}/*.json` in KPZ).
- **MathJSON migration:** All `expr` fields in `science_blocks` on Neon will be converted from expr-eval strings to MathJSON arrays. The KPZ FormulaEngine must be updated to use `@cortex-js/compute-engine` for evaluation. The `expr-eval` package can then be removed.
- **LaTeX rendering:** Each formula's LaTeX is auto-generated by the Compute Engine (`.latex` property). A `FormulaDisplay` component using KaTeX renders formulas in the Science admin panel and recipe editor tooltips.
- **One block per row:** Formula rows are always single objects (no arrays). This was enforced by splitting the legacy array rows (`formula/bake-duration` → `formula/bake-duration-oven` + `formula/rise-temp-factor`; `formula/composition` → `formula/suggested-salt` + `formula/estimate-w-from-protein`).
