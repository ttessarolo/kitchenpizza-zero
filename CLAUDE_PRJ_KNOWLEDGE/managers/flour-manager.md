# FlourManager

> **File:** `commons/utils/flour-manager.ts`
> **Science:** Yes
> **Status:** Complete

## Purpose

Centralized flour catalog, blending, and classification logic. Provides catalog lookup and search, weighted blending of flour properties (W, protein, P/L, absorption, etc.), strength estimation and classification via ScienceProvider, and flour suggestion by target W.

## Philosophy

Pure functions. Catalog data comes from `local_data/flour-catalog` (static import). Science classification uses `ScienceProvider.getClassification()` + `evaluateClassification()`. Blending uses linear weighted averages, which are valid for same-grain-type mixtures per Casucci Cap. 17-23.

## Exported Functions

| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `getFlour` | `(key, catalog?) => FlourCatalogEntry` | No | Lookup flour by key, fallback to index 5 (00 forte) |
| `getFloursByGroup` | `(group, catalog?) => FlourCatalogEntry[]` | No | Filter catalog by group ("Grano Tenero", "Grano Duro", "Speciali") |
| `searchFlours` | `(query, catalog?) => FlourCatalogEntry[]` | No | Case-insensitive search across labelKey, subKey, groupKey |
| `blendFlourProperties` | `(flours, catalog?) => BlendedFlourProps` | No | Weighted average of 9 properties (W, protein, P/L, absorption, ash, fiber, starchDamage, fermentSpeed, fallingNumber) |
| `estimateBlendW` | `(keys, catalog?) => number` | No | Equal-weight W estimate from flour keys (UI preview before grams are set) |
| `estimateW` | `(protein) => number` | No | W from protein: `22*protein - 70`, clamped [60, 420] |
| `classifyStrength` | `(provider, W) => string` | Yes | Classify W into strength category via ScienceProvider classification |
| `isWholeGrain` | `(flour) => boolean` | No | True if fiber > 6% |
| `isGlutenFree` | `(flour) => boolean` | No | True if W === 0 and fermentSpeed === 0 |
| `suggestForW` | `(targetW, catalog?, tolerance?) => FlourCatalogEntry[]` | No | Find flours near a target W, sorted by distance |
| `getFlourCatalog` | `(provider) => FlourCatalogEntry[]` | Yes | Get flour catalog from ScienceProvider |

## Re-exports

- `FLOUR_CATALOG`, `FLOUR_GROUPS` from `local_data/flour-catalog`

## Science Integration

### Blocks Used

| Block ID | Type | Location |
|----------|------|----------|
| `flour_strength` | classification | ScienceProvider.getClassification |
| `flours` | catalog | ScienceProvider.getCatalog |

### How Science Flows

`classifyStrength()` calls `provider.getClassification('flour_strength')` to get the classification definition (W ranges for weak/medium/strong/very_strong), then passes it to `evaluateClassification()` with `{ W }`. `getFlourCatalog()` reads the catalog directly from the provider.

## Key Formulas & Algorithms

- **Blending:** Weighted average: `sum(flour_i.g * property_i) / sum(flour_i.g)` for each property
- **W from protein:** `W = 22 * protein - 70` (linear correlation for Italian soft wheat, [C] Cap. 20)
- **Empty blend fallback:** Returns sensible defaults (protein 12, W 280, PL 0.55, absorption 60, etc.)

## Warnings & i18n

No warnings produced directly. Classification returns a string key from Science JSON.

## Dependencies

### Imports From
- `@commons/types/recipe` -- FlourCatalogEntry, FlourIngredient, BlendedFlourProps
- `local_data/flour-catalog` -- FLOUR_CATALOG, FLOUR_GROUPS
- `./format` -- rnd
- `./science/science-provider` -- ScienceProvider (type)
- `./science/formula-engine` -- evaluateClassification

### Depended On By
- `commons/utils/dough-manager.ts` -- re-exports getFlour, blendFlourProperties, estimateBlendW, estimateW
- `app/server/services/graph-reconciler.service.ts` -- getFlour, isGlutenFree, isWholeGrain
- `app/server/procedures/flour.ts`
- `tests/flour-manager.test.ts`, `tests/flour-mix.test.ts`, `tests/cookingsciencebrain.test.ts`, `tests/formula-engine.test.ts`

## How to Evolve

- Add multi-grain blending corrections (wheat + rye blends are not purely linear)
- Add flour recommendation engine (given recipe type, suggest optimal blends)
- Move FLOUR_CATALOG to ScienceProvider fully (already partially via getFlourCatalog)
