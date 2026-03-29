# Local Data Norms — DB-Ready & Multi-Language

All data in `local_data/` follows these mandatory rules:

### 1. No Hardcoded Human Text

Every translatable string (labels, descriptions, names) is stored as an **i18n key** (`labelKey`, `subKey`, `groupKey`, `lbKey`, `phaseDescriptionKeys`), never as raw text. Resolved text lives in `commons/i18n/{locale}/catalog.json`.

### 2. DB-Representable Structure

Every data file must be structured as if it were a PostgreSQL table row:
- `key: string` — primary key
- `labelKey: string` — i18n key for display label
- Numeric/boolean fields inline (scientific data stays in the row)
- No nested objects that can't be represented as columns or JSONB

### 3. i18n Key Naming Convention

```
{domain}_{key}              → flour_gt_00_deb, fat_olio_evo, rise_room
{domain}_{key}_sub          → flour_gt_00_deb_sub
{domain}_group_{groupKey}   → flour_group_grano_tenero
step_subtype_{key}          → step_subtype_tangzhong
phase_{method}_{n}          → phase_biga_1
colormap_{key}_lb           → colormap_pre_dough_lb
recipe_subtype_{key}        → recipe_subtype_napoletana
recipe_tpl_{id}_name        → recipe_tpl_1_name
```

### 4. DataProvider Abstraction

`commons/utils/data/` provides:
- `DataProvider` interface — typed query methods for all catalogs/configs
- `LocalDataProvider` — reads from `local_data/` TypeScript files (current)
- Future: `NeonDataProvider` — reads from PostgreSQL (drop-in replacement)
- `withLabels(rows, t)` — transitional helper to re-attach resolved labels

### 5. Adding New Catalog Data

1. Add data to `local_data/{domain}.ts` with `labelKey` (no Italian text)
2. Add i18n keys to `commons/i18n/en/catalog.json` (English base)
3. Add i18n keys to `commons/i18n/it/catalog.json` (Italian translation)
4. Update `DataProvider` interface + `LocalDataProvider` if new catalog
5. Components display via `t(item.labelKey)` using `useT()` hook

### 6. Future PostgreSQL Migration

Each catalog → 1 table with `label_key TEXT` column. Translations either stay in i18n JSON files or move to a `translation(key, locale, value)` table. The `DataProvider` interface stays identical — only the implementation swaps.
