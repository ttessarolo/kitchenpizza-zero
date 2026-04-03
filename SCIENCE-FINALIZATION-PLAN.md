# SCIENCE-FINALIZATION-PLAN.md

## Purpose

Surgical instructions for Claude Code to complete the Science migration — removing ALL remaining hardcoded values from managers and replacing them with `ScienceProvider` reads. This plan covers managers **not already refactored** and the **10 new Neon blocks** created on 2026-04-03.

> **Context:** `SCIENCE-MIGRATION-PLAN.md` covers the major managers (bake, rise, flour, pastry, sauce, dough, fermentation-coherence) and is the reference for those. This plan covers the **remaining managers** and provides the **exact Neon block IDs** for new blocks.

---

## Prerequisites (Already Done)

- [x] MathJSON migration complete (all expressions are MathJSON arrays)
- [x] CortexJS Compute Engine integrated (replaces expr-eval)
- [x] DbScienceProvider created and wired via middleware
- [x] FormulaDisplay + KaTeX rendering added
- [x] CSB Python validator updated for MathJSON
- [x] **10 new defaults blocks created on Neon** (see inventory below)

---

## New Neon Blocks Inventory (10 blocks, created 2026-04-03)

Total science_blocks on Neon: **58** (48 original + 10 new).

| # | DB id | Inner id | Domain | Contents |
|---|---|---|---|---|
| 1 | `defaults/pre-bake-configs` | `pre_bake_configs` | bake | Enums, suggestions map, default configs for all 9 pre-bake subtypes, validation ranges |
| 2 | `defaults/prep-safety-and-speed` | `prep_safety_and_speed` | prep | `safeRoomTime` by category, `cutSpeed` by style, `cookedMultiplier` |
| 3 | `defaults/ferment-layer-constants` | `ferment_layer_constants` | ferment | `minSafeSaltPct`, `tempRanges` (3 ranges), `saltAdjustment` threshold/factor |
| 4 | `defaults/sauce-method-modifiers` | `sauce_method_modifiers` | sauce | `baseMinPerLiter` fallback, `rapid`/`cold` multipliers |
| 5 | `defaults/pre-ferment-constants` | `pre_ferment_constants` | ferment | `allowanceMargin` (1.01), default flour/liquid/yeast types |
| 6 | `defaults/dough-salt-constants` | `dough_salt_constants` | dough | `suggestedSalt` params, `airIncorporationPct` default |
| 7 | `defaults/rise-constants` | `rise_constants` | dough | Default `q10Coeff` (1), `baselineTemp` (24) |
| 8 | `defaults/pastry-safety` | `pastry_safety` | pastry | `custard` (safeTemp, minDurationS), `meringue` (stableRatio) |
| 9 | `defaults/bake-duration-fallbacks` | `bake_duration_fallbacks` | bake | `safeDefaultDuration` (10), factor lookup tables |
| 10 | `defaults/flour-suggestion` | `flour_suggestion` | dough | `tolerance` (50), `fallbackFlourIndex` (5) |

---

## Manager Refactoring Instructions

### A. `prep-layer-manager.ts` — Remove `SAFE_ROOM_TIME` and `CUT_SPEED`

**File:** `commons/utils/prep-layer-manager.ts`

**Hardcoded constants to remove:**

```typescript
// DELETE these (lines 14-31):
const SAFE_ROOM_TIME: Record<string, number> = {
  protein: 120, dairy: 60, vegetable: 240, grain: 480, fruit: 240,
}
const CUT_SPEED: Record<string, number> = {
  julienne: 80, brunoise: 50, chiffonade: 120, dice: 100, slice: 150, mince: 60, rough: 200,
}
```

**Neon block:** `defaults/prep-safety-and-speed` (inner id: `prep_safety_and_speed`)

**Block structure on Neon:**
```json
{
  "safeRoomTime": { "protein": 120, "dairy": 60, "vegetable": 240, "grain": 480, "fruit": 240 },
  "cutSpeed": { "julienne": 80, "brunoise": 50, "chiffonade": 120, "dice": 100, "slice": 150, "mince": 60, "rough": 200 },
  "cookedMultiplier": 1.5,
  "defaultSafeTime": 120,
  "defaultCutSpeed": 100
}
```

**Refactored functions:**

```typescript
export function calcSafeRoomTime(
  provider: ScienceProvider,
  ingredientCategory: string,
  isCooked: boolean,
): number {
  const block = provider.getBlock('prep_safety_and_speed') as any
  const safeRoomTime: Record<string, number> = block?.safeRoomTime ?? {}
  const defaultTime = block?.defaultSafeTime ?? 120
  const cookedMult = block?.cookedMultiplier ?? 1.5
  const baseTime = safeRoomTime[ingredientCategory] ?? defaultTime
  return isCooked ? Math.round(baseTime * cookedMult) : baseTime
}

export function calcPrepDuration(
  provider: ScienceProvider,  // was _provider — now actually used
  cutStyle: string,
  quantityGrams: number,
): number {
  const block = provider.getBlock('prep_safety_and_speed') as any
  const cutSpeed: Record<string, number> = block?.cutSpeed ?? {}
  const defaultSpeed = block?.defaultCutSpeed ?? 100
  const gramsPerMinute = cutSpeed[cutStyle] ?? defaultSpeed
  return Math.max(1, Math.round(quantityGrams / gramsPerMinute))
}
```

**Checklist:**
- [ ] Delete `SAFE_ROOM_TIME` and `CUT_SPEED` const declarations
- [ ] Update `calcSafeRoomTime()` to read from provider
- [ ] Update `calcPrepDuration()` to read from provider (use `provider` instead of `_provider`)
- [ ] Remove hardcoded `1.5` multiplier — read `cookedMultiplier` from block
- [ ] Remove hardcoded `120` and `100` fallbacks — read `defaultSafeTime` / `defaultCutSpeed`

---

### B. `ferment-layer-manager.ts` — Remove `MIN_SAFE_SALT_PCT` and fallback ranges

**File:** `commons/utils/ferment-layer-manager.ts`

**Hardcoded constants to remove:**

```typescript
// DELETE (line 16):
const MIN_SAFE_SALT_PCT = 2

// DELETE fallback ranges in calcFermentDuration() catch block (lines 70-72):
if (tempC < 15) baseDuration = { minDays: 7, maxDays: 14 }
else if (tempC < 25) baseDuration = { minDays: 3, maxDays: 7 }
else baseDuration = { minDays: 2, maxDays: 5 }

// DELETE hardcoded salt adjustment (line 76):
const saltAdjust = saltPct > 3 ? 1 + (saltPct - 3) * 0.1 : 1
```

**Neon block:** `defaults/ferment-layer-constants` (inner id: `ferment_layer_constants`)

**Block structure on Neon:**
```json
{
  "minSafeSaltPct": 2,
  "tempRanges": [
    { "maxTemp": 15, "minDays": 7, "maxDays": 14 },
    { "maxTemp": 25, "minDays": 3, "maxDays": 7 },
    { "maxTemp": 999, "minDays": 2, "maxDays": 5 }
  ],
  "saltAdjustment": { "threshold": 3, "factorPerPct": 0.1 }
}
```

**Refactored functions:**

```typescript
export function calcBrineConcentration(
  provider: ScienceProvider,
  saltG: number,
  vegetableG: number,
  waterG: number,
): { pct: number; safe: boolean } {
  const block = provider.getBlock('ferment_layer_constants') as any
  const minSafeSaltPct = block?.minSafeSaltPct ?? 2
  const totalWeight = saltG + vegetableG + waterG
  if (totalWeight <= 0) return { pct: 0, safe: false }
  const pct = Math.round((saltG / totalWeight) * 1000) / 10
  return { pct, safe: pct >= minSafeSaltPct }
}

export function calcFermentDuration(
  provider: ScienceProvider,
  _fermentType: string,
  tempC: number,
  saltPct: number,
): { minDays: number; maxDays: number } {
  const block = provider.getBlock('ferment_layer_constants') as any
  let baseDuration: { minDays: number; maxDays: number }

  try {
    const result = evaluatePiecewise(
      provider.getPiecewise('ferment_duration_by_temp'),
      { tempC },
    ) as { minDays: number; maxDays: number }
    baseDuration = result
  } catch {
    // Fallback from provider constants
    const ranges: { maxTemp: number; minDays: number; maxDays: number }[] = block?.tempRanges ?? []
    const match = ranges.find(r => tempC < r.maxTemp)
    baseDuration = match
      ? { minDays: match.minDays, maxDays: match.maxDays }
      : { minDays: 3, maxDays: 7 }
  }

  // Salt adjustment from provider
  const saltAdj = block?.saltAdjustment ?? { threshold: 3, factorPerPct: 0.1 }
  const saltAdjust = saltPct > saltAdj.threshold
    ? 1 + (saltPct - saltAdj.threshold) * saltAdj.factorPerPct
    : 1

  return {
    minDays: Math.round(baseDuration.minDays * saltAdjust),
    maxDays: Math.round(baseDuration.maxDays * saltAdjust),
  }
}
```

**Checklist:**
- [ ] Delete `MIN_SAFE_SALT_PCT` constant
- [ ] Update `calcBrineConcentration()` to read `minSafeSaltPct` from provider
- [ ] Update `calcFermentDuration()` to read fallback ranges from provider
- [ ] Read salt adjustment threshold and factor from provider

---

### C. `ferment-manager.ts` — Remove `FERMENT_SUBTYPE_DEFAULTS`

**File:** `commons/utils/ferment-manager.ts`

**Hardcoded constants to remove:**

```typescript
// DELETE (lines 14-21):
const FERMENT_SUBTYPE_DEFAULTS: Record<string, Partial<FermentMasterConfig>> = {
  lattofermentazione: { saltPercentage: 2.5, targetPH: 4.0, temperature: 20, duration: 72, vessel: 'jar' },
  salamoia: { saltPercentage: 5.0, targetPH: 3.8, temperature: 18, duration: 168, vessel: 'crock' },
  kombucha: { saltPercentage: 0, targetPH: 2.5, temperature: 24, duration: 168, vessel: 'jar' },
  kefir: { saltPercentage: 0, targetPH: 3.5, temperature: 22, duration: 24, vessel: 'jar' },
  miso: { saltPercentage: 10, targetPH: 4.5, temperature: 25, duration: 4320, vessel: 'crock' },
  kimchi: { saltPercentage: 3, targetPH: 3.5, temperature: 18, duration: 120, vessel: 'jar' },
}
```

**Neon block:** `defaults/ferment-types` (inner id: `ferment_type_defaults`) — **already existed** in the original 48 blocks.

**Refactored `getDefaults()`:**

```typescript
export function getDefaults(subtype: string, provider: ScienceProvider): Partial<FermentMasterConfig> {
  const d = provider.getDefaults('ferment_subtype_defaults', subtype, null) as Record<string, unknown>
  if (d && Object.keys(d).length > 0 && d.saltPercentage != null) {
    return d as unknown as Partial<FermentMasterConfig>
  }
  return {}  // No hardcoded fallback — if not in DB, return empty
}
```

**Checklist:**
- [ ] Delete `FERMENT_SUBTYPE_DEFAULTS` constant
- [ ] Remove the fallback `return FERMENT_SUBTYPE_DEFAULTS[subtype] ?? {}` line
- [ ] Return empty `{}` when provider has no data (no hardcoded fallback)
- [ ] Verify Neon block `defaults/ferment-types` contains all 6 subtypes

---

### D. `prep-manager.ts` — Remove `PREP_SUBTYPE_DEFAULTS`

**File:** `commons/utils/prep-manager.ts`

**Hardcoded constants to remove:**

```typescript
// DELETE (lines 14-21):
const PREP_SUBTYPE_DEFAULTS: Record<string, Partial<PrepMasterConfig>> = {
  topping: { servings: 4, yield: 300 },
  filling: { servings: 4, yield: 500 },
  garnish: { servings: 4, yield: 100 },
  base: { servings: 4, yield: 600 },
  marinade: { servings: 4, yield: 400 },
  generic: { servings: 4, yield: 500 },
}
```

**Neon block:** `defaults/prep-types` (inner id: `prep_type_defaults`) — **already existed** in the original 48 blocks.

**Refactored `getDefaults()`:**

```typescript
export function getDefaults(subtype: string, provider: ScienceProvider): Partial<PrepMasterConfig> {
  const d = provider.getDefaults('prep_subtype_defaults', subtype, null) as Record<string, unknown>
  if (d && Object.keys(d).length > 0 && d.servings != null) {
    return d as unknown as Partial<PrepMasterConfig>
  }
  return {}  // No hardcoded fallback
}
```

**Checklist:**
- [ ] Delete `PREP_SUBTYPE_DEFAULTS` constant
- [ ] Remove the fallback line
- [ ] Return empty `{}` when provider has no data

---

### E. `pre-bake-manager.ts` — Remove all enum arrays, SUGGESTIONS map, and switch defaults

**File:** `commons/utils/pre-bake-manager.ts`

**Hardcoded constants to remove:**

```typescript
// DELETE (lines 16-27): All VALID_* arrays
const VALID_LIQUID_TYPES = [...]
const VALID_DOCK_TOOLS = [...]
const VALID_DOCK_PATTERNS = [...]
const VALID_FLOUR_TYPES = [...]
const VALID_FLOUR_APPLICATIONS = [...]
const VALID_OIL_TYPES = [...]
const VALID_OIL_METHODS = [...]
const VALID_OIL_SURFACES = [...]
const VALID_STEAM_METHODS = [...]
const VALID_STEAM_VOLUMES = [...]
const ALL_SUBTYPES = [...]

// DELETE (lines 31-39): SUGGESTIONS map
const SUGGESTIONS: Record<string, string[]> = { ... }

// DELETE (lines 47-85): getDefaultConfig() switch statement
```

**Neon block:** `defaults/pre-bake-configs` (inner id: `pre_bake_configs`)

**Block structure on Neon:**
```json
{
  "validEnums": {
    "liquidTypes": ["water_malt", "water_honey", "water_sugar", "lye_solution", "baking_soda"],
    "dockTools": ["fork", "docker_roller", "skewer"],
    "dockPatterns": ["uniform", "center_only", "edge_sparing"],
    "flourTypes": ["rice", "semolina", "tipo00", "rye", "cornmeal"],
    "flourApplications": ["surface", "base_only", "all_over"],
    "oilTypes": ["olive", "canola", "peanut", "sunflower", "avocado"],
    "oilMethods": ["spray", "brush", "drizzle"],
    "oilSurfaces": ["top", "bottom", "both"],
    "steamMethods": ["water_pan", "ice_cubes", "spray_bottle", "steam_injection"],
    "steamVolumes": ["small", "medium", "large"],
    "allSubtypes": ["boil", "dock", "flour_dust", "oil_coat", "steam_inject", "brush", "topping", "scoring", "generic"]
  },
  "suggestions": {
    "griglia": ["dock", "oil_coat"],
    "padella": ["oil_coat"],
    "aria": ["oil_coat"],
    "frittura": [],
    "vapore": [],
    "forno": ["scoring", "steam_inject", "flour_dust"],
    "pentola": ["scoring", "flour_dust"]
  },
  "defaultConfigs": {
    "boil": { "method": "boil", "cfg": { "liquidType": "water_malt", "liquidTemp": 100, "additivePct": 2, "flipOnce": true, "drainTime": 1 } },
    "dock": { "method": "dock", "cfg": { "tool": "fork", "pattern": "uniform" } },
    "flour_dust": { "method": "flour_dust", "cfg": { "flourType": "rice", "application": "surface" } },
    "oil_coat": { "method": "oil_coat", "cfg": { "oilType": "olive", "method": "spray", "surface": "both" } },
    "steam_inject": { "method": "steam_inject", "cfg": { "method": "water_pan", "waterVolume": "small", "removeAfter": 15 } },
    "brush": { "method": "brush", "cfg": null },
    "topping": { "method": "topping", "cfg": null },
    "scoring": { "method": "scoring", "cfg": null },
    "generic": { "method": "generic", "cfg": null }
  },
  "validationRanges": {
    "boil": { "liquidTemp": [85, 100], "additivePct": [1, 5], "drainTime": [0.5, 2] },
    "steam_inject": { "removeAfter": [10, 25] }
  }
}
```

**Refactored functions:**

```typescript
// Helper to load the block once per call chain
function getPreBakeBlock(provider: ScienceProvider): any {
  return provider.getBlock('pre_bake_configs') as any
}

export function getDefaultConfig(provider: ScienceProvider, subtype: string): PreBakeConfig {
  const block = getPreBakeBlock(provider)
  const cfg = block?.defaultConfigs?.[subtype]
  if (!cfg) throw new Error(`Unknown pre_bake sub-type: "${subtype}"`)
  return cfg as PreBakeConfig
}

export function suggestPreBakeFor(provider: ScienceProvider, bakeSubtype: string): string[] {
  const block = getPreBakeBlock(provider)
  return block?.suggestions?.[bakeSubtype] ?? []
}

// In validateConfig(): replace VALID_* arrays with reads from block.validEnums
// In validateConfig(): replace hardcoded ranges with block.validationRanges
```

**Note:** `getDefaultConfig` and `suggestPreBakeFor` gain a `provider` parameter. All callers must be updated.

**Checklist:**
- [ ] Delete all `VALID_*` const arrays
- [ ] Delete `ALL_SUBTYPES` array
- [ ] Delete `SUGGESTIONS` map
- [ ] Rewrite `getDefaultConfig()` to read from `provider.getBlock('pre_bake_configs').defaultConfigs`
- [ ] Add `provider: ScienceProvider` parameter to `getDefaultConfig()` and `suggestPreBakeFor()`
- [ ] Update `validateConfig()` to read enums and ranges from the block
- [ ] Update all callers of `getDefaultConfig()` and `suggestPreBakeFor()` to pass provider

---

### F. `sauce-manager.ts` — Remove hardcoded method multipliers

**File:** `commons/utils/sauce-manager.ts`

**Hardcoded values to remove (in `calcSauceDuration`):**

```typescript
// Lines 81, 90: hardcoded values
const baseMinPerLiter = Number(entry?.baseMinPerLiter ?? 30)  // fallback 30
duration *= 0.6  // rapid multiplier
duration = 5     // cold duration
```

**Neon block:** `defaults/sauce-method-modifiers` (inner id: `sauce_method_modifiers`)

**Block structure on Neon:**
```json
{
  "baseMinPerLiterFallback": 30,
  "methodMultipliers": {
    "rapid": 0.6,
    "cold": null
  },
  "coldFixedMinutes": 5
}
```

**Refactored `calcSauceDuration()`:**

```typescript
export function calcSauceDuration(
  provider: ScienceProvider,
  sauceType: string,
  volume: number,
  method: 'simmer' | 'rapid' | 'cold',
): number {
  const modifiers = provider.getBlock('sauce_method_modifiers') as any
  const catalog = provider.getCatalog('sauce_types')
  const entry = catalog.find((e) => (e as Record<string, unknown>).key === sauceType) as Record<string, unknown> | undefined

  const fallbackBase = modifiers?.baseMinPerLiterFallback ?? 30
  const baseMinPerLiter = Number(entry?.baseMinPerLiter ?? fallbackBase)

  const volumeLiters = volume / 1000
  let duration = baseMinPerLiter * volumeLiters

  switch (method) {
    case 'rapid': {
      const mult = modifiers?.methodMultipliers?.rapid ?? 0.6
      duration *= mult
      break
    }
    case 'cold':
      duration = modifiers?.coldFixedMinutes ?? 5
      break
    case 'simmer':
    default:
      break
  }

  return Math.round(Math.max(duration, 1))
}
```

**Checklist:**
- [ ] Read `baseMinPerLiterFallback` from provider instead of hardcoded `30`
- [ ] Read `rapid` multiplier from provider instead of hardcoded `0.6`
- [ ] Read `coldFixedMinutes` from provider instead of hardcoded `5`

---

### G. `pre-ferment-manager.ts` — Remove hardcoded allowance margin

**File:** `commons/utils/pre-ferment-manager.ts`

**Hardcoded value to remove:**

```typescript
// Line 70: hardcoded 1.01 margin
_totalFlourAllowance: totalFlour * 1.01,
_totalLiquidAllowance: totalLiquid * 1.01,
```

**Neon block:** `defaults/pre-ferment-constants` (inner id: `pre_ferment_constants`)

**Block structure on Neon:**
```json
{
  "allowanceMargin": 1.01,
  "defaultFlourType": "gt_0_for",
  "defaultLiquidType": "Acqua",
  "defaultYeastType": "fresh"
}
```

**Refactored `validatePreFerment()`:**

```typescript
export function validatePreFerment(
  provider: ScienceProvider,
  cfg: PreFermentConfig,
  totalFlour: number,
  totalLiquid: number,
  totalDough: number,
): RuleResult[] {
  const constants = provider.getBlock('pre_ferment_constants') as any
  const margin = constants?.allowanceMargin ?? 1.01
  const { pfFlour, pfWater } = computePreFermentAmounts(totalDough, cfg)
  const ctx: Record<string, unknown> = {
    preFermentPct: cfg.preFermentPct,
    hydrationPct: cfg.hydrationPct,
    pfFlour,
    pfWater,
    _totalFlourAllowance: totalFlour * margin,
    _totalLiquidAllowance: totalLiquid * margin,
  }
  return evaluateRules(provider.getRules('pre_ferment'), ctx)
}
```

Also update `recalcPreFermentIngredients()` to optionally use provider defaults for ingredient types:

```typescript
const constants = provider?.getBlock('pre_ferment_constants') as any
const flourType = step.flours[0]?.type || constants?.defaultFlourType || 'gt_0_for'
const liquidType = step.liquids[0]?.type || constants?.defaultLiquidType || 'Acqua'
const yeastType = cfg.yeastType || step.yeasts[0]?.type || constants?.defaultYeastType || 'fresh'
```

**Checklist:**
- [ ] Read `allowanceMargin` from provider instead of hardcoded `1.01`
- [ ] Optionally read default ingredient types from provider
- [ ] Keep `computePreFermentAmounts()` unchanged (pure math, no domain constants)

---

### H. `dough-manager.ts` — Remove remaining fallback values

**File:** `commons/utils/dough-manager.ts`

**Hardcoded values still present:**

```typescript
// Line 119: airPct fallback
const airPct = provider?.getFormula('final_dough_temp')?.constants?.airIncorporationPct ?? 0.15

// Lines 150-153: salt formula fallbacks
const basePct = formula?.constants?.basePct ?? 2.5
const adjFactor = formula?.constants?.adjustFactor ?? 0.01
const minPct = formula?.constants?.minPct ?? 2.0
const maxPct = formula?.constants?.maxPct ?? 3.0
```

**Neon block:** `defaults/dough-salt-constants` (inner id: `dough_salt_constants`)

**Block structure on Neon:**
```json
{
  "suggestedSalt": { "basePct": 2.5, "adjustFactor": 0.01, "minPct": 2.0, "maxPct": 3.0, "hydrationThreshold": 60 },
  "airIncorporationPct": 0.15
}
```

**Refactoring:**

1. Make `provider` **required** in `calcFinalDoughTemp()` (remove `?`):
   ```typescript
   export function calcFinalDoughTemp(
     provider: ScienceProvider,  // no longer optional
     flours: FlourIngredient[],
     liquids: LiquidIngredient[],
     ambientTemp: number,
     frictionFactor: number,
   ): number {
     const block = provider.getBlock('dough_salt_constants') as any
     const airPct = block?.airIncorporationPct ?? 0.15
     // ... rest unchanged
   }
   ```
   **Note:** This changes the function signature — `provider` moves to first position. Update all callers.

2. `computeSuggestedSalt()` — remove `??` fallbacks, read from formula block OR from `dough_salt_constants`:
   ```typescript
   export function computeSuggestedSalt(provider: ScienceProvider, totalFlour: number, hydration: number): number {
     const formula = provider.getFormula('suggested_salt')
     if (formula) {
       return evaluateFormula(formula, { totalFlour, hydration })
     }
     // Fallback from constants block
     const block = provider.getBlock('dough_salt_constants') as any
     const s = block?.suggestedSalt
     const adjustment = Math.max(0, (hydration - (s?.hydrationThreshold ?? 60)) * (s?.adjustFactor ?? 0.01))
     const pct = Math.min(s?.maxPct ?? 3.0, Math.max(s?.minPct ?? 2.0, (s?.basePct ?? 2.5) + adjustment))
     return rnd(totalFlour * pct / 100)
   }
   ```

**Checklist:**
- [ ] Make `provider` required in `calcFinalDoughTemp()` (move to first param)
- [ ] Read `airIncorporationPct` from `dough_salt_constants` block
- [ ] Update `computeSuggestedSalt()` to use formula or constants block
- [ ] Update all callers of `calcFinalDoughTemp()` for new signature

---

### I. `flour-manager.ts` — Remove empty-blend fallback and suggestion tolerance

**File:** `commons/utils/flour-manager.ts`

**Hardcoded values to remove:**

```typescript
// Lines 75-82: Empty blend fallback
if (t <= 0) {
  return {
    protein: 12, W: 280, PL: 0.55, absorption: 60, ash: 0.55,
    fiber: 2.5, starchDamage: 7, fermentSpeed: 1, fallingNumber: 300,
  }
}

// Line 75: fallingNumber fallback in loop
wFN += f.g * (c.fallingNumber ?? 300)

// Line 111: estimateBlendW fallback
if (keys.length === 0) return 280

// Line 131: estimateW hardcoded fallback
return Math.round(Math.max(60, Math.min(420, 22 * protein - 70)))

// Line 172: tolerance default
export function suggestForW(targetW: number, catalog: FlourCatalogEntry[], tolerance = 50)

// Line 31: catalog fallback to index 5
return catalog.find((f) => f.key === key) || catalog[5]
```

**Neon blocks:**
- `defaults/flour-blend-fallback` (inner id: `flour_blend_fallback`) — **already existed**
- `defaults/flour-suggestion` (inner id: `flour_suggestion`) — **new**

**Block structure for `flour_suggestion`:**
```json
{
  "tolerance": 50,
  "fallbackFlourIndex": 5,
  "estimateW_fallback": { "slope": 22, "intercept": -70, "clampMin": 60, "clampMax": 420 }
}
```

**Refactored key functions:**

```typescript
export function getFlour(key: string, catalog: FlourCatalogEntry[], provider?: ScienceProvider): FlourCatalogEntry {
  const block = provider?.getBlock('flour_suggestion') as any
  const fallbackIdx = block?.fallbackFlourIndex ?? 5
  return catalog.find((f) => f.key === key) || catalog[fallbackIdx]
}

export function blendFlourProperties(
  provider: ScienceProvider,
  flours: FlourIngredient[],
  catalog: FlourCatalogEntry[],
): BlendedFlourProps {
  // ... weighted average loop ...
  if (t <= 0) {
    const fallback = provider.getBlock('flour_blend_fallback') as any
    return fallback?.emptyBlend as BlendedFlourProps
  }
  // fallingNumber fallback also from flour_blend_fallback
  const block = provider.getBlock('flour_blend_fallback') as any
  const defaultFN = block?.emptyBlend?.fallingNumber ?? 300
  // In loop: wFN += f.g * (c.fallingNumber ?? defaultFN)
}

export function suggestForW(
  provider: ScienceProvider,
  targetW: number,
  catalog: FlourCatalogEntry[],
): FlourCatalogEntry[] {
  const block = provider.getBlock('flour_suggestion') as any
  const tolerance = block?.tolerance ?? 50
  return catalog
    .filter((f) => Math.abs(f.W - targetW) <= tolerance && f.W > 0)
    .sort((a, b) => Math.abs(a.W - targetW) - Math.abs(b.W - targetW))
}
```

**Checklist:**
- [ ] Add `provider: ScienceProvider` to `blendFlourProperties()` signature
- [ ] Read empty-blend fallback from `flour_blend_fallback` block
- [ ] Read `fallingNumber` default from the same block
- [ ] Read `tolerance` from `flour_suggestion` block in `suggestForW()`
- [ ] Read `fallbackFlourIndex` from `flour_suggestion` block in `getFlour()`
- [ ] Remove hardcoded fallback in `estimateW()` — make provider required
- [ ] Update all callers for new signatures

---

### J. `rise-manager.ts` — Remove baseline temperature fallback

**File:** `commons/utils/rise-manager.ts`

**Hardcoded value:**

```typescript
// Line 68: baseline fallback
let baseline = 24
```

**Neon block:** `defaults/rise-constants` (inner id: `rise_constants`)

**Block structure on Neon:**
```json
{
  "defaultQ10Coeff": 1,
  "baselineTemp": 24
}
```

**Refactored `riseTemperatureFactor()`:**

```typescript
export function riseTemperatureFactor(provider: ScienceProvider, fdt: number, riseMethod: string): number {
  const constants = provider.getBlock('rise_constants') as any
  let coeff = constants?.defaultQ10Coeff ?? 1
  let baseline = constants?.baselineTemp ?? 24
  const catalog = provider.getCatalog('rise_methods')
  const entry = (catalog as any[]).find((e: any) => e.key === riseMethod)
  if (entry?.q10Coeff != null) coeff = entry.q10Coeff
  // Note: per-entry baseline override still possible via catalog metadata
  return Math.pow(2, (-(fdt - baseline) * coeff) / 10)
}
```

**Checklist:**
- [ ] Read `baselineTemp` and `defaultQ10Coeff` from `rise_constants` block
- [ ] Remove hardcoded `let baseline = 24` and `let coeff = 1`

---

### K. `pastry-manager.ts` — Remove `??` fallbacks for safety constants

**File:** `commons/utils/pastry-manager.ts`

**Hardcoded fallbacks to remove:**

```typescript
// Line 94-95:
const safeTemp = block?.custard?.safeTemp ?? 82
const minDur = block?.custard?.minDurationS ?? 10

// Line 120:
const stableRatio = block?.meringue?.stableRatio ?? 1.5
```

**Neon block:** `defaults/pastry-safety` (inner id: `pastry_safety`)

**Block structure on Neon:**
```json
{
  "custard": { "safeTemp": 82, "minDurationS": 10 },
  "meringue": { "stableRatio": 1.5 }
}
```

**Refactoring:** Change these functions to read from the dedicated `pastry_safety` block instead of trying to get them from `pastry_subtype_defaults`:

```typescript
export function checkCustardPasteurization(
  provider: ScienceProvider,
  temp: number,
  duration: number,
  hasEggs: boolean,
): { safe: boolean } {
  if (!hasEggs) return { safe: true }
  const block = provider.getBlock('pastry_safety') as any
  const safeTemp = block?.custard?.safeTemp ?? 82
  const minDur = block?.custard?.minDurationS ?? 10
  return { safe: temp >= safeTemp && duration >= minDur }
}

export function calcMeringueRatio(
  provider: ScienceProvider,
  eggWhiteG: number,
  sugarG: number,
): { ratio: number; stable: boolean } {
  if (eggWhiteG <= 0) return { ratio: 0, stable: false }
  const block = provider.getBlock('pastry_safety') as any
  const stableRatio = block?.meringue?.stableRatio ?? 1.5
  const ratio = Math.round((sugarG / eggWhiteG) * 100) / 100
  return { ratio, stable: ratio >= stableRatio }
}
```

**Checklist:**
- [ ] Change `provider.getBlock('pastry_subtype_defaults')` → `provider.getBlock('pastry_safety')` in custard/meringue functions
- [ ] Keep `?? fallback` values temporarily for safety (they match Neon data)
- [ ] Remove fallbacks in a follow-up once confirmed working

---

### L. `bake-manager.ts` — Remove safe default duration and factor fallbacks

**File:** `commons/utils/bake-manager.ts`

**Hardcoded values still present:**

```typescript
// Line 99: safe default duration
return 10

// Lines 107-110: factor map fallbacks
const modeFactors: Record<string, number> = block?.modeFactor ?? { static: 1.0, fan: 0.85, steam: 1.0 }
const steamerFactors: Record<string, number> = block?.steamerFactor ?? { bamboo: 1.0, electric: 0.9 }
const fryMethodFactors: Record<string, number> = block?.fryMethodFactor ?? { deep: 1.0, shallow: 1.2 }
const fuelFactors: Record<string, number> = block?.fuelFactor ?? { gas: 1.0, charcoal: 1.1, electric: 1.0 }
```

**Neon block:** `defaults/bake-duration-fallbacks` (inner id: `bake_duration_fallbacks`)

**Block structure on Neon:**
```json
{
  "safeDefaultDuration": 10,
  "factorFallbacks": {
    "modeFactor": { "static": 1.0, "fan": 0.85, "steam": 1.0 },
    "steamerFactor": { "bamboo": 1.0, "electric": 0.9 },
    "fryMethodFactor": { "deep": 1.0, "shallow": 1.2 },
    "fuelFactor": { "gas": 1.0, "charcoal": 1.1, "electric": 1.0 }
  }
}
```

**Refactoring:**

```typescript
export function calcDuration(
  provider: ScienceProvider,
  subtype: string,
  cookingCfg: CookingConfig,
  recipeType: string,
  recipeSubtype: string | null,
  thickness: number,
): number {
  const profile = getBakingProfile(provider, recipeType, recipeSubtype)
    ?? getBakingProfile(provider, subtype, null)

  if (!profile) {
    const fallbacks = provider.getBlock('bake_duration_fallbacks') as any
    return fallbacks?.safeDefaultDuration ?? 10
  }

  // Load factors — prefer cooking_factors block, fall back to bake_duration_fallbacks
  const block = provider.getBlock('cooking_factors') as any
  const fb = provider.getBlock('bake_duration_fallbacks') as any
  const modeFactors = block?.modeFactor ?? fb?.factorFallbacks?.modeFactor ?? {}
  const steamerFactors = block?.steamerFactor ?? fb?.factorFallbacks?.steamerFactor ?? {}
  const fryMethodFactors = block?.fryMethodFactor ?? fb?.factorFallbacks?.fryMethodFactor ?? {}
  const fuelFactors = block?.fuelFactor ?? fb?.factorFallbacks?.fuelFactor ?? {}
  // ... rest unchanged
}
```

**Checklist:**
- [ ] Read `safeDefaultDuration` from `bake_duration_fallbacks` block
- [ ] Read factor fallback maps from the same block
- [ ] Remove inline hardcoded factor objects

---

### M. `fermentation-coherence-manager.ts` — Remove remaining hardcoded defaults

**File:** `commons/utils/fermentation-coherence-manager.ts`

**Hardcoded values still present:**

```typescript
// Line 142: default room temperature for Formula L
tempC: 24,

// Line 143: default hydration for Formula L
hydration: 56,

// Line 192: minBaseDur fallback
let minBaseDur = 15

// Lines 231-232: suggestion defaults
let defaultTempC = 24
let defaultHydration = 56
```

These are **already mostly read from the constraint block** but have `??` fallbacks. The constraint block `constraint/fermentation-coherence` on Neon has `adaptationStrategies.suggestion.defaults.tempC` and `adaptationStrategies.parametric.minBaseDur`.

**Refactoring:** The current code already tries to read from the constraint. Just verify the constraint block has the right values and keep the `??` fallbacks as safety nets (they match Neon data).

**Checklist:**
- [ ] Verify `constraint/fermentation-coherence` has `adaptationStrategies.parametric.minBaseDur: 15`
- [ ] Verify it has `adaptationStrategies.suggestion.defaults: { tempC: 24, hydration: 56 }`
- [ ] No code changes needed if constraint block is correct — fallbacks are defense-in-depth

---

## Signature Change Summary

These managers gain or change `provider` parameter position. **All callers must be updated.**

| Manager | Function | Change |
|---|---|---|
| `pre-bake-manager` | `getDefaultConfig()` | Add `provider: ScienceProvider` as first param |
| `pre-bake-manager` | `suggestPreBakeFor()` | Add `provider: ScienceProvider` as first param |
| `dough-manager` | `calcFinalDoughTemp()` | Move `provider` to first param (was last, optional) |
| `flour-manager` | `blendFlourProperties()` | Add `provider: ScienceProvider` as first param |
| `flour-manager` | `suggestForW()` | Add `provider: ScienceProvider` as first param |
| `flour-manager` | `getFlour()` | Add optional `provider?: ScienceProvider` as third param |

**Where to find callers:**
- `app/components/recipe-flow/` — editor components
- `commons/utils/graph-reconciler*.ts` — reconciliation service
- `app/server/procedures/` — oRPC procedures
- `tests/` — test files

---

## Execution Order

1. **Start with isolated managers** (no caller changes): `ferment-manager` (C), `prep-manager` (D), `pastry-manager` (K), `rise-manager` (J)
2. **Then managers with minor caller updates**: `ferment-layer-manager` (B), `sauce-manager` (F), `pre-ferment-manager` (G), `bake-manager` (L), `fermentation-coherence-manager` (M)
3. **Then managers with signature changes**: `prep-layer-manager` (A), `dough-manager` (H), `flour-manager` (I), `pre-bake-manager` (E)
4. **After all managers**: update `graph-reconciler-v2.service.ts` and oRPC procedures
5. **Final**: delete unused `local_data/` files, run all tests

---

## Testing

After each manager refactoring:

1. Run `pnpm test` — all existing tests must pass
2. For managers with new provider reads, verify the Neon block returns the expected values
3. For signature changes, grep the codebase for the old call pattern and update all callers

---

## Files to Delete After Migration

Once all managers are confirmed working:

- `local_data/dough-defaults.ts`
- `local_data/baking-profiles.ts`
- `local_data/rise-methods.ts`
- `local_data/fat-catalog.ts`
- `local_data/flour-catalog.ts`
- Any other `local_data/` files that are fully replaced by Neon blocks

**Keep `FileScienceProvider` and `/science/*.json` for tests and local dev.**
