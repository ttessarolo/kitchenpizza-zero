# Objective 1 — Seed All KPZ Data into Neon PostgreSQL

> **Target:** Claude Code session on KitchenPizza-Zero
> **Database:** Neon project `cooking-science-brain` (ID: `tiny-scene-15818370`, PostgreSQL 17, eu-central-1)
> **Default database name:** `neondb`

---

## Overview

Transfer ALL science data and taxonomy data currently stored as local files (JSON + TypeScript) into the shared Neon PostgreSQL database. After this migration:

- The Science Engine reads from `science_blocks` table via `DbScienceProvider`
- All taxonomies (node types, preparations, ingredients, techniques, equipment, baking profiles) are in the `taxonomies` table
- All i18n keys for science content are in `science_i18n` table
- Local files become redundant and can be deleted (see `KPZ-MIGRATION-GUIDE.md`)

---

## Database Schema (already created)

### Table: `science_blocks`
```sql
id              TEXT PRIMARY KEY,       -- block semantic ID (e.g. 'yeast_formula')
type            TEXT NOT NULL,          -- 'formula'|'factor_chain'|'piecewise'|'classification'|'rule'|'catalog'|'defaults'
domain          TEXT,                   -- 'dough'|'fermentation'|'baking'|'sauce'|'pastry'|'prep'|NULL
data            JSONB NOT NULL,         -- ENTIRE block as consumed by FormulaEngine
description     TEXT,                   -- natural language description (MANDATORY)
version         INT DEFAULT 1,
status          TEXT DEFAULT 'active',
source          TEXT DEFAULT 'seed',
source_id       TEXT,
created_at      TIMESTAMPTZ,
updated_at      TIMESTAMPTZ
```

### Table: `taxonomies`
```sql
id              UUID PRIMARY KEY,
kind            TEXT NOT NULL,          -- 'node_type'|'preparation'|'ingredient'|'technique'|'equipment'|'baking_profile'
key             TEXT NOT NULL,          -- unique key within (kind, parent_id)
parent_id       UUID FK → taxonomies(id),
depth           INT DEFAULT 0,
label_key       TEXT,                   -- i18n key (MANDATORY for UX-facing entries)
description_key TEXT,                   -- i18n key for subtitle/description
icon            TEXT,                   -- emoji or icon identifier
domain          TEXT,                   -- RPG domain binding
properties      JSONB DEFAULT '{}',     -- kind-specific data
sort_order      INT DEFAULT 0,
status          TEXT DEFAULT 'active',
source_id       TEXT,
created_at, updated_at TIMESTAMPTZ
```
Unique constraint: `(kind, COALESCE(parent_id, NULL_UUID), key)`

### Table: `science_i18n`
```sql
locale          TEXT NOT NULL,          -- 'it', 'en'
key             TEXT NOT NULL,          -- i18n key
value           TEXT NOT NULL,          -- translated string
PRIMARY KEY (locale, key)
```

---

## Part A — Seed Science Blocks (~100 blocks from `/science/`)

### A.1 File mapping

Each JSON file in `/science/` contains one or more Science blocks. The `id` for the database comes from the block's `meta.id` field.

| Directory | Files | Block type | Count |
|-----------|-------|-----------|-------|
| `science/formulas/` | 9 files | formula, factor_chain, piecewise | 11 blocks |
| `science/rules/` | 10 files | rule | 77 blocks (grouped by file) |
| `science/catalogs/` | 10 files | catalog | 10 blocks |
| `science/classifications/` | 4 files | classification, piecewise | 4 blocks |
| `science/defaults/` | 7 files | defaults | 7 blocks |

### A.2 Seeding procedure

For each JSON file:

1. Read the file contents
2. Extract `meta.id`, `meta.type`, `meta.domain`, `meta.description`
3. **CRITICAL i18n fix** (see Part D): if the block contains hardcoded Italian labels, replace them with i18n keys before storing
4. INSERT into `science_blocks`:
   ```sql
   INSERT INTO science_blocks (id, type, domain, data, description, source)
   VALUES ($1, $2, $3, $4::jsonb, $5, 'seed')
   ```

### A.3 Rules special case

Rule files contain arrays of `RuleBlock` objects. Each file is stored as a SINGLE `science_blocks` row where:
- `id` = the rule domain identifier (e.g. `dough-warnings`, `fermentation-coherence`)
- `type` = `'rule'`
- `data` = the entire array wrapped in the file's structure

### A.4 Defaults special case

Default files contain entries keyed by `type:subtype` patterns. Store each file as a single row:
- `id` = the defaults identifier (e.g. `dough-defaults`, `sauce-type-defaults`)
- `type` = `'defaults'`
- `data` = the entire JSON file contents

---

## Part B — Seed Taxonomies from `/local_data/`

### B.1 Node Types (from `step-types.ts`)

**Kind:** `node_type`
**Domain:** varies (most are `impasto`, some universal)

Structure: 14 root types (depth=0), each with 0-9 subtypes (depth=1).

```
For each entry in STEP_TYPES:
  1. INSERT root: kind='node_type', key=entry.key, depth=0, label_key=entry.labelKey, icon=entry.icon, domain='impasto'
  2. For each subtype in entry.subtypes:
     INSERT child: kind='node_type', key=subtype.key, parent_id=<root.id>, depth=1,
                   label_key=subtype.labelKey, domain='impasto',
                   properties=subtype.defaults (as JSONB)
```

**Special entries by domain:**
- `prep` → domain='prep'
- `split`, `join` → domain='*' (universal)
- `done` → domain='*'
- All others → domain='impasto'

Also seed the `COLOR_MAP` data. For each root type that has a color entry:
- Add to the root node's `properties`: `{ "bgVar": "...", "txVar": "...", "lbKey": "..." }`

### B.2 Preparations (from `recipe-types.ts`)

**Kind:** `preparation`

Structure: 5 root types (depth=0), each with 1-6 subtypes (depth=1).

```
For each entry in RECIPE_TYPES:
  1. INSERT root: kind='preparation', key=entry.key, depth=0, label_key=entry.labelKey, icon=entry.icon
  2. For each subtype in RECIPE_SUBTYPES[entry.key]:
     INSERT child: kind='preparation', key=subtype.key, parent_id=<root.id>, depth=1,
                   label_key=subtype.labelKey,
                   properties=subtype.defaults (as JSONB: {mode, hyd, thickness, ballG})
```

### B.3 Ingredients — Flours (from `flour-catalog.ts`)

**Kind:** `ingredient`

Structure: 3-level hierarchy.

```
1. INSERT root: kind='ingredient', key='flours', depth=0, label_key='ingredient_group_flours'

2. INSERT groups (depth=1):
   - 'grano_tenero' → label_key='flour_group_grano_tenero'
   - 'grano_duro'   → label_key='flour_group_grano_duro'
   - 'speciali'     → label_key='flour_group_speciali'

3. INSERT individual flours (depth=2):
   For each flour in FLOUR_CATALOG:
     parent_id = <its group id>
     label_key = flour.labelKey (e.g. 'flour_gt_00_med')
     description_key = flour.subKey (e.g. 'flour_gt_00_med_sub')
     properties = { w: flour.w, protein: flour.protein, absorption: flour.absorption, category: flour.category }
```

### B.4 Ingredients — Fats (from `fat-catalog.ts`)

**Kind:** `ingredient`

```
1. INSERT group: kind='ingredient', key='fats', depth=0 (or depth=1 under an 'ingredients' root), label_key='ingredient_group_fats'
2. INSERT each fat as depth=1 child:
   properties = { waterPct, state, frying, smokePoint, fermentEffect }
```

### B.5 Ingredients — Salts & Sugars (from `salt-sugar-catalog.ts`)

**Kind:** `ingredient`

```
1. INSERT group 'salts': label_key='ingredient_group_salts'
2. INSERT each salt as child, properties = { conversionFactor, grindSize }
3. INSERT group 'sugars': label_key='ingredient_group_sugars'
4. INSERT each sugar as child, properties = { conversionFactor, hygroscopic, fermentEffect }
```

### B.6 Techniques — Kneading (from `knead-methods.ts`)

**Kind:** `technique`

```
1. INSERT root: kind='technique', key='kneading', depth=0, label_key='technique_group_kneading'
2. INSERT each method as depth=1 child:
   properties = { ff: <force_factor> }
```

### B.7 Techniques — Rise Methods (from `rise-methods.ts` + `science/catalogs/rise-methods.json`)

**Kind:** `technique`

Merge data from BOTH sources — the TS file has `labelKey` and `tf`, the JSON has `q10Coeff`.

```
1. INSERT root: kind='technique', key='rise_methods', depth=0, label_key='technique_group_rise'
2. INSERT each method as depth=1 child:
   properties = { tf: <time_factor>, tempRange: [...], q10Coeff: <from JSON> }
```

### B.8 Equipment — Tray Presets (from `tray-presets.ts`)

**Kind:** `equipment`

```
1. INSERT root: kind='equipment', key='tray_presets', depth=0, label_key='equipment_group_trays'
2. INSERT each preset as depth=1 child:
   properties = { l, w, h, material, griglia }
```

### B.9 Equipment — Tray Materials (from `tray-presets.ts`)

**Kind:** `equipment`

```
1. INSERT root: kind='equipment', key='tray_materials', depth=0, label_key='equipment_group_materials'
2. INSERT each material as depth=1 child:
   properties = { bMin, bMax, defTemp, hasVent }
```

### B.10 Baking Profiles (from `baking-profiles.ts`)

**Kind:** `baking_profile`

These are indexed by `type:subtype` (some have `subtype: null` as fallback).

```
For each profile in BAKING_PROFILES:
  INSERT: kind='baking_profile',
          key = profile.subtype ? `${profile.type}:${profile.subtype}` : `${profile.type}:_fallback`,
          depth=0,
          domain = profile.type,
          properties = {
            timeRange, refTemp, tempRange, cieloPctRange,
            materialFactors, thicknessFactor, baseThickness,
            isPrecottura, recommendedModes
          }
```

Note: baking profiles are FLAT (no parent-child hierarchy), all at depth=0. The `key` encodes the type:subtype lookup pattern.

### B.11 Ingredient Presets (from `ingredient-presets.ts`)

**Kind:** `ingredient`

```
1. INSERT group: kind='ingredient', key='liquid_presets', depth=0
2. INSERT each liquid as depth=1 child (key=preset value, label_key=preset value)
3. INSERT group: kind='ingredient', key='extra_presets', depth=0
4. INSERT each extra as depth=1 child
```

---

## Part C — Seed i18n Keys into `science_i18n`

### C.1 Existing Science i18n keys

Read from `commons/i18n/it/science.json` and `commons/i18n/en/science.json`. These already contain:
- `warning.*` — rule warning messages
- `advisory.*` — rule advisory messages
- `action.*` — rule action labels
- `validation.*` — validation messages
- `variant.*` — formula variant descriptions
- `meta.*` — block metadata

For each key-value pair in each locale file:
```sql
INSERT INTO science_i18n (locale, key, value) VALUES ($1, $2, $3)
ON CONFLICT (locale, key) DO UPDATE SET value = EXCLUDED.value
```

### C.2 Existing catalog i18n keys

Read from `commons/i18n/it/catalog.json` and `commons/i18n/en/catalog.json` (if exists).
Same INSERT pattern.

---

## Part D — Fix Hardcoded Labels in Science Catalogs (Option B)

**CRITICAL:** Before seeding science catalog blocks, replace ~87 hardcoded Italian labels with i18n keys.

### D.1 Files to fix

| File | Fields to convert | New key pattern |
|------|-------------------|-----------------|
| `science/catalogs/flours.json` | `label`, `group` | `catalog.flour.<key>`, `catalog.flour.group_<group>` |
| `science/catalogs/fats.json` | `label` | `catalog.fat.<key>` |
| `science/catalogs/salts-sugars.json` | `label` | `catalog.salt.<key>`, `catalog.sugar.<key>` |
| `science/catalogs/sauce-types.json` | `label` | `catalog.sauce.<key>` |
| `science/catalogs/pastry-types.json` | `label` | `catalog.pastry.<key>` |
| `science/catalogs/rise-methods.json` | `label` | `catalog.rise.<key>` |
| `science/catalogs/ferment-types.json` | `label` | `catalog.ferment.<key>` |
| `science/catalogs/oven-config.json` | `label` | `catalog.oven.<key>`, `catalog.oven_mode.<key>` |
| `science/classifications/flour-strength.json` | class labels | `classification.flour_strength.<key>` |
| `science/classifications/pastry-temper.json` | class labels | `classification.pastry_temper.<key>` |

### D.2 Procedure

For each file:

1. Read the JSON
2. For each entry with a hardcoded `label` field:
   a. Generate the i18n key (e.g. `catalog.flour.gt_00_med`)
   b. Save the original Italian text → INSERT into `science_i18n` with locale='it'
   c. Generate English translation → INSERT into `science_i18n` with locale='en'
   d. Replace the `label` field value with the i18n key: `"label": "catalog.flour.gt_00_med"`
3. Store the MODIFIED JSON (with i18n keys instead of hardcoded strings) into `science_blocks.data`

### D.3 New i18n keys to create

After conversion, add ALL new keys to BOTH locale files:
- `commons/i18n/it/catalog.json` — Italian translations (= original hardcoded strings)
- `commons/i18n/en/catalog.json` — English translations (create this file if it doesn't exist)

Example entries:
```json
// it/catalog.json
{
  "catalog.flour.gt_00_deb": "00 debole",
  "catalog.flour.gt_00_med": "00 media",
  "catalog.flour.group_grano_tenero": "Grano Tenero",
  "catalog.fat.olio_evo": "Olio Extra Vergine",
  "catalog.salt.sale_fino": "Sale Fino",
  "catalog.sauce.sugo": "Sugo (pomodoro)",
  "classification.flour_strength.weak": "Debole",
  "classification.flour_strength.medium": "Media"
}

// en/catalog.json
{
  "catalog.flour.gt_00_deb": "00 Weak",
  "catalog.flour.gt_00_med": "00 Medium",
  "catalog.flour.group_grano_tenero": "Soft Wheat",
  "catalog.fat.olio_evo": "Extra Virgin Olive Oil",
  "catalog.salt.sale_fino": "Fine Salt",
  "catalog.sauce.sugo": "Tomato Sauce",
  "classification.flour_strength.weak": "Weak",
  "classification.flour_strength.medium": "Medium"
}
```

---

## Part E — Implementation Notes

### E.1 Seeding script

Create a seeding script (TypeScript, runs via `tsx` or `ts-node`) that:
1. Connects to Neon via the connection string from `.env`
2. Reads all source files
3. Performs the i18n conversion (Part D)
4. Inserts all data in the correct order (taxonomies first, then science_blocks, then i18n)
5. Uses transactions per-table for atomicity
6. Is idempotent (uses `ON CONFLICT DO UPDATE` where appropriate)

Place the script in a new directory: `scripts/seed-db/`

### E.2 Connection string

The Neon connection string should be added to `.env`:
```
NEON_DATABASE_URL=postgresql://neondb_owner:***@ep-***.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Get the actual connection string from the Neon dashboard or via `neon connection-string`.

### E.3 Verification

After seeding, verify:
```sql
-- Science blocks count
SELECT type, count(*) FROM science_blocks GROUP BY type ORDER BY type;
-- Expected: ~100 blocks total

-- Taxonomy counts
SELECT kind, count(*) FROM taxonomies GROUP BY kind ORDER BY kind;
-- Expected: node_type ~51, preparation ~25, ingredient ~50+, technique ~7, equipment ~16, baking_profile ~27

-- i18n coverage
SELECT locale, count(*) FROM science_i18n GROUP BY locale;
-- Expected: it ~300+, en ~300+
```

---

## Constraints

- **i18n MANDATORY**: every user-facing text MUST use `t('key')` — no hardcoded strings in JSX
- **expr-eval compatibility**: formulas use `expr-eval` syntax with custom `clamp()` function — do NOT modify formula expressions
- **Idempotent**: the seed script must be re-runnable without duplicating data
- **No schema changes**: the tables are already created — only INSERT data
