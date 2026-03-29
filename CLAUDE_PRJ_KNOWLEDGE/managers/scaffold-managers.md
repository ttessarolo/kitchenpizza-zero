# Scaffold Managers

> A **scaffold manager** provides `getDefaults(subtype)` and a stub `getWarnings()` returning `[]`.
> No Science integration yet. Created during multi-layer rollout to unblock UI.

---

## FermentManager (`ferment-manager.ts`)

**Current state:**
- 6 subtype defaults: `lattofermentazione`, `salamoia`, `kombucha`, `kefir`, `miso`, `kimchi`
- `getWarnings()` returns empty array
- No ScienceProvider usage

**Overlap:** `FermentLayerManager` (`ferment-layer-manager.ts`) already has actual Science logic for brine concentration, fermentation duration, and warnings.

**Roadmap to promote:**
1. Merge `getDefaults()` logic into `FermentLayerManager` or keep separate if defaults are UI-only
2. Add Science blocks: `ferment_ph_curve`, `ferment_salt_safety`, `ferment_temperature_profile`
3. Implement pH curve tracking, salt range validation, temperature profiles per subtype
4. Wire warnings through `evaluateRules()` with `messageKey`
5. Add i18n keys for all 6 subtypes

---

## PrepManager (`prep-manager.ts`)

**Current state:**
- 6 subtype defaults: `topping`, `filling`, `garnish`, `base`, `marinade`, `generic`
- `getWarnings()` returns empty array
- No ScienceProvider usage

**Overlap:** `PrepLayerManager` (`prep-layer-manager.ts`) already has food safety and prep duration logic.

**Roadmap to promote:**
1. Merge `getDefaults()` into `PrepLayerManager` or keep separate if defaults are UI-only
2. Add Science blocks: `prep_yield_factor`, `prep_timing_by_method`, `prep_waste_factor`
3. Implement yield calculations, timing by method, waste factor estimation
4. Wire warnings through `evaluateRules()` with `messageKey`
5. Add i18n keys for all 6 subtypes

---

## How to Promote a Scaffold

Follow [how-to-create-new-manager.md](how-to-create-new-manager.md) starting from Step 2 (Science blocks), since the manager file already exists. Key steps:

1. Add `provider: ScienceProvider` as first parameter to domain functions
2. Create Science JSON blocks in `/science/`
3. Add i18n keys in both `en` and `it`
4. Replace stub `getWarnings()` with `evaluateRules()` calls
5. Write tests with `FileScienceProvider`
6. Update the manager's doc in this directory
