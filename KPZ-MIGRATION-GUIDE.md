# KPZ Migration Guide — From Local Files to Neon PostgreSQL

> **Target:** Claude Code session on KitchenPizza-Zero
> **Prerequisite:** Objective 1 (data seeding) completed successfully
> **Database:** Neon project `cooking-science-brain` (ID: `tiny-scene-15818370`)

---

## Overview

After the data seeding (Objective 1), all Science blocks and taxonomy data live in the Neon PostgreSQL database. This document specifies:
- **(A)** Which local files can be deleted
- **(B)** Which software components must be converted to use the DB
- **(C)** What stays local (not migrated)

---

## Part A — Files to Delete After Migration

### A.1 Science JSON files (`/science/`)

ALL 40 files can be deleted — their contents are now in the `science_blocks` table:

```
science/
├── formulas/           ← DELETE ENTIRE DIRECTORY
│   ├── yeast.json
│   ├── yeast-inverse.json
│   ├── yeast-w-correction.json
│   ├── rise-duration.json
│   ├── ferment-duration.json
│   ├── bake-duration.json
│   ├── dough-temp.json
│   ├── sauce-reduction.json
│   └── composition.json
├── rules/              ← DELETE ENTIRE DIRECTORY
│   ├── dough-warnings.json
│   ├── fermentation-coherence.json
│   ├── baking-advisories.json
│   ├── pre-bake-advisories.json
│   ├── pre-ferment-validation.json
│   ├── rise-warnings.json
│   ├── sauce-warnings.json
│   ├── ferment-warnings.json
│   ├── pastry-warnings.json
│   └── prep-warnings.json
├── catalogs/           ← DELETE ENTIRE DIRECTORY
│   ├── flours.json
│   ├── fats.json
│   ├── salts-sugars.json
│   ├── rise-methods.json
│   ├── baking-profiles.json
│   ├── cooking-factors.json
│   ├── oven-config.json
│   ├── sauce-types.json
│   ├── ferment-types.json
│   └── pastry-types.json
├── classifications/    ← DELETE ENTIRE DIRECTORY
│   ├── flour-strength.json
│   ├── min-fermentation-hours.json
│   ├── pastry-temper.json
│   └── rise-capacity.json
└── defaults/           ← DELETE ENTIRE DIRECTORY
    ├── dough.json
    ├── cooking-configs.json
    ├── sauce-types.json
    ├── ferment-types.json
    ├── pastry-types.json
    ├── prep-types.json
    └── frying-amounts.json
```

### A.2 Local data TypeScript files (`/local_data/`)

These files have been seeded into the `taxonomies` table:

```
local_data/
├── flour-catalog.ts        ← DELETE (now in taxonomies, kind='ingredient')
├── fat-catalog.ts          ← DELETE (now in taxonomies, kind='ingredient')
├── salt-sugar-catalog.ts   ← DELETE (now in taxonomies, kind='ingredient')
├── rise-methods.ts         ← DELETE (now in taxonomies, kind='technique')
├── oven-config.ts          ← DELETE (now in taxonomies, kind='equipment')
├── step-types.ts           ← DELETE (now in taxonomies, kind='node_type')
├── recipe-types.ts         ← DELETE (now in taxonomies, kind='preparation')
├── baking-profiles.ts      ← DELETE (now in taxonomies, kind='baking_profile')
├── tray-presets.ts         ← DELETE (now in taxonomies, kind='equipment')
├── knead-methods.ts        ← DELETE (now in taxonomies, kind='technique')
├── ingredient-presets.ts   ← DELETE (now in taxonomies, kind='ingredient')
├── dough-defaults.ts       ← DELETE (now in science_blocks, type='defaults')
└── index.ts                ← UPDATE (remove deleted re-exports)
```

### A.3 i18n improvements

The following files were UPDATED (not deleted) during seeding with ~87 new i18n keys replacing hardcoded Italian labels:

```
commons/i18n/it/catalog.json    ← UPDATED with new keys
commons/i18n/en/catalog.json    ← CREATED (new file with English translations)
```

---

## Part B — Software Components to Convert

### B.1 `DbScienceProvider` — NEW (replaces `FileScienceProvider`)

**File:** `commons/utils/science/db-science-provider.ts` (create new)

Must implement the existing `ScienceProvider` interface:

```typescript
export interface ScienceProvider {
  getFormula(id: string): FormulaBlock
  getFactorChain(id: string): FactorChainBlock
  getPiecewise(id: string): PiecewiseBlock
  getRules(domain: string): RuleBlock[]
  getClassification(id: string): ClassificationBlock
  getCatalog(name: string): Record<string, unknown>[]
  getDefaults(id: string, type: string, subtype: string | null): Record<string, unknown>
  listAll(): ScienceBlock[]
  getBlock(id: string): ScienceBlock | null
  saveBlock(block: ScienceBlock): void
  getI18nKeys(locale: string): Record<string, string>
  saveI18nKey(locale: string, key: string, value: string): void
}
```

**Implementation strategy:**
- Server-side only (runs in oRPC procedures, not in browser)
- Uses the Neon connection string from `.env`
- Queries `science_blocks` table for block data
- Queries `science_i18n` table for translations
- Caches blocks in memory after first load (invalidate on mutation)

**SQL queries needed:**
```sql
-- getFormula / getFactorChain / getPiecewise / getClassification / getBlock
SELECT data FROM science_blocks WHERE id = $1 AND status = 'active'

-- getRules
SELECT data FROM science_blocks WHERE type = 'rule' AND domain = $1 AND status = 'active'

-- getCatalog
SELECT data FROM science_blocks WHERE type = 'catalog' AND id = $1 AND status = 'active'

-- getDefaults
SELECT data FROM science_blocks WHERE type = 'defaults' AND id = $1 AND status = 'active'

-- listAll
SELECT id, type, domain, data, description FROM science_blocks WHERE status = 'active'

-- getI18nKeys
SELECT key, value FROM science_i18n WHERE locale = $1

-- saveBlock
INSERT INTO science_blocks (id, type, domain, data, description, source)
VALUES ($1, $2, $3, $4::jsonb, $5, 'manual')
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, version = science_blocks.version + 1

-- saveI18nKey
INSERT INTO science_i18n (locale, key, value)
VALUES ($1, $2, $3)
ON CONFLICT (locale, key) DO UPDATE SET value = EXCLUDED.value
```

### B.2 `FileScienceProvider` — DELETE

**File:** `commons/utils/science/file-science-provider.ts`

Delete this file entirely after `DbScienceProvider` is working. All server-side code that uses `FileScienceProvider` should switch to `DbScienceProvider`.

### B.3 `StaticScienceProvider` — EVALUATE

**File:** `commons/utils/science/static-science-provider.ts`

This provider bundles Science data at build-time for browser use. Two options:

**Option 1 — Keep with DB-generated bundle:** At build time, query all active blocks from DB and generate the static import file. The provider stays read-only in the browser.

**Option 2 — Replace with API calls:** Browser fetches science data via oRPC procedures at runtime. Removes the static bundle but adds network dependency.

**Recommendation:** Option 1 for now — less disruptive. Add a build script that generates the static bundle from DB data.

### B.4 oRPC Procedures — UPDATE

**Files in `app/server/procedures/`:**

Create or update procedures that serve taxonomy and science data:

```typescript
// New: taxonomy procedures
getTaxonomyTree: procedure({ kind: z.string(), domain: z.string().optional() })
  → query taxonomies table, return hierarchical tree

getTaxonomyEntry: procedure({ id: z.string() })
  → query single entry with children

// New: science procedures (if serving to browser)
getScienceBlocks: procedure({ type: z.string().optional(), domain: z.string().optional() })
  → query science_blocks table

getScienceBlock: procedure({ id: z.string() })
  → query single block
```

### B.5 Components and Managers that Import from `local_data/`

Search the codebase for ALL imports from `local_data/` and update them to use DB data via oRPC:

| Current Import | Used By | Replacement |
|---------------|---------|-------------|
| `STEP_TYPES` from `local_data/step-types` | `LayerTypePicker`, flow editor | oRPC procedure querying `taxonomies` (kind='node_type') |
| `COLOR_MAP` from `local_data/step-types` | Step node rendering | oRPC procedure or include in taxonomy properties |
| `RECIPE_TYPES` / `RECIPE_SUBTYPES` from `local_data/recipe-types` | `LayerTypePicker`, onboarding | oRPC procedure querying `taxonomies` (kind='preparation') |
| `FLOUR_CATALOG` from `local_data/flour-catalog` | Flour selector component | oRPC procedure querying `taxonomies` (kind='ingredient', parent='flours') |
| `FAT_CATALOG` from `local_data/fat-catalog` | Fat selector component | oRPC procedure querying `taxonomies` (kind='ingredient', parent='fats') |
| `SALT_CATALOG` / `SUGAR_CATALOG` from `local_data/salt-sugar-catalog` | Salt/sugar selectors | oRPC procedure querying `taxonomies` (kind='ingredient') |
| `KNEAD_METHODS` from `local_data/knead-methods` | Dough step config | oRPC procedure querying `taxonomies` (kind='technique', parent='kneading') |
| `RISE_METHODS` / `YEAST_TYPES` from `local_data/rise-methods` | Rise step config | oRPC procedure querying `taxonomies` (kind='technique', parent='rise_methods') |
| `OVEN_TYPES` / `OVEN_MODES` from `local_data/oven-config` | Bake step config | oRPC procedure querying `taxonomies` (kind='equipment') |
| `BAKING_PROFILES` from `local_data/baking-profiles` | Bake duration calculator | oRPC procedure querying `taxonomies` (kind='baking_profile') |
| `TRAY_PRESETS` / `TRAY_MATERIALS` from `local_data/tray-presets` | Tray selector | oRPC procedure querying `taxonomies` (kind='equipment') |
| `LIQUID_PRESETS` / `EXTRA_PRESETS` from `local_data/ingredient-presets` | Ingredient selectors | oRPC procedure querying `taxonomies` (kind='ingredient') |
| `DOUGH_DEFAULTS` from `local_data/dough-defaults` | Default value resolution | `DbScienceProvider.getDefaults()` |

### B.6 `generate-layer-graph.ts`

**File:** `app/lib/generate-layer-graph.ts`

Currently uses hardcoded step types and defaults. After migration:
- Read step type sequence from `taxonomies` (kind='node_type', domain=layer domain)
- Read defaults from `science_blocks` (type='defaults')
- Read baking profile from `taxonomies` (kind='baking_profile', key=type:subtype)

### B.7 `LayerTypePicker.tsx`

**File:** `app/components/recipe-flow/LayerTypePicker.tsx`

Currently imports `RECIPE_TYPES` and `RECIPE_SUBTYPES` statically. After migration:
- Fetch preparation taxonomy tree via oRPC at component mount
- 3-step picker populates dynamically from DB data
- Variants and defaults come from taxonomy `properties` JSONB

### B.8 Recipe Flow Store

**File:** `app/stores/recipe-flow-store.ts`

The `addLayer()` action uses template data from local files. After migration:
- `resolveTemplate()` queries `taxonomies` (kind='preparation')
- Template defaults come from `properties` JSONB

---

## Part C — What Stays Local (NOT Migrated)

### C.1 LLM Configuration

```
local_data/llm-prompts.ts     ← STAYS (Brain 3 configuration, not CSB data)
local_data/llm-perimeter.ts   ← STAYS (LLM safety boundaries, not CSB data)
```

These are KPZ-specific LLM configuration that is not part of the shared knowledge base.

### C.2 Recipe data

```
local_data/recipes/            ← STAYS (user recipe data, separate concern)
```

---

## Migration Order

The recommended order for implementing these changes:

1. **Add Neon connection** to KPZ `.env` and create DB client utility
2. **Create `DbScienceProvider`** and verify it passes the same tests as `FileScienceProvider`
3. **Create oRPC procedures** for taxonomy queries
4. **Update components** one by one (start with simpler ones like KNEAD_METHODS, then complex ones like LayerTypePicker)
5. **Update `generate-layer-graph.ts`** and recipe flow store
6. **Update `StaticScienceProvider`** build pipeline (Option 1)
7. **Delete local files** once all imports are replaced
8. **Update `local_data/index.ts`** to only re-export llm-prompts and llm-perimeter
9. **Run full test suite** to verify nothing is broken

---

## Environment Variable

Add to `.env`:
```
NEON_DATABASE_URL=postgresql://neondb_owner:***@ep-***.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Use the same connection string as the CSB project — it's the same shared database.

---

## Constraints

- **i18n MANDATORY**: all labels from DB use i18n keys resolved via `t()` — NEVER display raw keys
- **expr-eval compatibility**: formulas from DB use the same expr-eval syntax — the FormulaEngine doesn't change
- **Fallback chains**: `getDefaults()` must preserve the existing fallback: `type:subtype` → `type:null` → `altro:null`
- **No breaking changes**: the `ScienceProvider` interface stays identical — only the implementation changes
- **Mobile app**: the native app still needs `StaticScienceProvider` — ensure build-time bundle generation works
