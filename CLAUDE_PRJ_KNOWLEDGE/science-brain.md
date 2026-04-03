# CookingScienceBrain — Externalized Scientific Logic

### Philosophy

**Zero hardcoded science in code.** All baking knowledge — formulas, thresholds, factor chains, classification rules, advisory conditions, catalog data — lives in declarative JSON (local) or Neon PostgreSQL (production). The TypeScript Managers are pure execution engines: they receive logic from a `ScienceProvider`, evaluate MathJSON expressions via `@cortex-js/compute-engine`, and return results. This separation enables:

- **Non-developers can edit baking science** (via admin panel or JSON files) without touching code
- **Multiple formula variants** coexist (e.g., Casucci Formula L vs Q10 model for yeast) — the user or system chooses
- **i18n is decoupled** — `/science/` contains only logic keys (`messageKey`), human text lives in `/i18n/`
- **Future DB migration** — swap `FileScienceProvider` for `DbScienceProvider` without changing any Manager
- **Auditable** — every formula cites its scientific source (`ref: "[C] Cap. 44"`)

### How it works

```
/science/*.json                 /i18n/{locale}/science.json
     │ (logic)                       │ (text)
     ▼                               ▼
ScienceProvider ──────────────► Manager.function(provider, ...)
     │                               │
     ▼                               ▼
FormulaEngine (MathJSON/CE)     RuleEngine (conditions)
     │                               │
     ▼                               ▼
{ result: 0.172 }               { messageKey, messageVars, actions }
                                     │
                                     ▼
                                Client: t(messageKey, vars) → localized text
```

All functions with scientific logic take `provider: ScienceProvider` as their first parameter. There is no hardcoded fallback — all science lives in JSON.

All scientific formulas, rules, thresholds, and catalogs are stored as JSON in `/science/`. Text messages are in `/i18n/` (EN base + IT current).

### Structure

```
/science/
├── schema/cookingsciencebrain.schema.json   ← JSON Schema validation
├── formulas/                         ← formula, factor_chain blocks
├── rules/                            ← rule blocks (messageKey, no text)
├── catalogs/                         ← catalog blocks (flours, fats, etc.)
├── defaults/                         ← defaults blocks (per type/subtype)
└── classifications/                  ← piecewise, classification blocks

/i18n/
├── en/science.json                   ← English (base)
└── it/science.json                   ← Italian (current)
```

### Block types

| Type | Purpose | Example |
|------|---------|---------|
| `formula` | MathJSON expression | `["Divide", "K", ["Multiply", "REF_HYD", ...]]` |
| `factor_chain` | Multiplicative: base × f1 × f2 × ... | Rise duration (11 factors) |
| `piecewise` | Step function | W > 380 → 20h |
| `classification` | Categorization | W → weak/medium/strong |
| `rule` | Advisory/warning with conditions + actions | Steam too long → split phases |
| `catalog` | Data table | 28 flour types |
| `defaults` | Per-type/subtype config | Pizza napoletana salt 2.3% |

### Key principles

- **No text in `/science/`** — only `messageKey`, `labelKey`, `titleKey` pointing to `/i18n/`
- **Formulas can have `variants`** — alternative scientific approaches (e.g., Formula L vs Q10)
- **Rules can have `selectionMode: "choose_one"`** — alternative strategies for the user
- **ScienceProvider** is abstract — `FileScienceProvider` (today), `DbScienceProvider` (future)
- **Admin panel** at `/admin/science` — list, view, edit blocks and i18n keys (auth + admin role)

### Rule engine — advisory & warnings

The rule engine (`commons/utils/science/rule-engine.ts`) evaluates declarative rules against a context object. It replaces the original `advisory-manager.ts`:

- **Returns `messageKey` + `messageVars`** — never resolved text. The client resolves via i18n.
- **`selectionMode: "choose_one"`** — actions as alternative strategies (radio select), not just independent buttons.
- **`variants`** on formulas — alternative scientific approaches with `applicability` ranges for auto-suggestion.
- **`_meta`** on every block — section, displayName, description, tags for the admin panel.

### Admin panel — `/admin/science`

Protected route (auth + admin role via Clerk `sessionClaims`). Three pages:

- **Dashboard** (`/admin/science`) — lists all science blocks grouped by `_meta.section`, with type badges and tags
- **Rule detail** (`/admin/science/rules/$id`) — shows full block structure: expression, variants, constants, conditions, actions, factors, raw JSON
- **i18n editor** (`/admin/science/i18n`) — side-by-side EN/IT key viewer

Admin oRPC procedures: `science.listBlocks`, `science.getBlock`, `science.updateBlock`, `science.listI18n`, `science.updateI18n` — all behind `authProcedure`.

### Adding new science

1. Create JSON file in appropriate `/science/` subdirectory
2. Follow `cookingsciencebrain.schema.json` format
3. Add i18n keys to `/i18n/en/science.json` and `/i18n/it/science.json`
4. Add `_meta` with section, displayName, description, tags
5. Implement the function in the relevant Manager with `provider: ScienceProvider` as first parameter
6. Write tests using `FileScienceProvider`
7. The new block will automatically appear in the admin panel dashboard

### CookingScienceBrain — Mandatory Integration for ALL Managers

Every Manager that contains domain knowledge (formulas, thresholds, warnings, catalogs, defaults) MUST use CookingScienceBrain. There is NO hardcoded fallback.

1. **Single API**: all functions with scientific logic take `provider: ScienceProvider` as their first parameter. There is no version without provider.

2. **Warning/Advisory**: ALL warning messages return `RuleResult` with `messageKey` + `messageVars`. Never resolved text in managers. The client resolves via `t(messageKey, messageVars)`.

3. **ActionableWarning**: UI interface is purely i18n-native.
   - `messageKey: string` (mandatory)
   - `messageVars?: Record<string, unknown>`
   - `sourceNodeId?: string` — which graph node triggered the warning (for red highlighting + per-node editor display)
   - `_ctx?: Record<string, unknown>` — evaluation context for action mutations to resolve `_contextRef:` values
   - `actions?: WarningAction[]` — actionable fix suggestions with `GraphMutation[]`
   - No `message: string` field

4. **DedupedWarning**: UI display type extending `ActionableWarning` with `count: number` and `affectedNodeIds: string[]`. Used by `deduplicateWarnings()` (`commons/utils/warning-dedup.ts`) to group per-node markers by `messageKey` for display.

5. **Warning Display**: Warnings appear in two places:
   - **General Panel** (`DoughCompositionPanel`): all composition/fermentation warnings, deduplicated, with "Apply All" button that triggers `autoCorrectGraph()`
   - **Node Editor** (`NodeDetailPanel`): per-node warnings filtered by `sourceNodeId === nodeId`, with individual action buttons

6. **New Managers**: when creating a new Manager:
   a. Create JSON blocks in `/science/` (formulas, rules, catalogs, defaults)
   b. Add i18n keys to `/commons/i18n/{en,it}/science.json`
   c. Implement functions with `provider: ScienceProvider` as first param
   d. Use `toActionableWarnings()` to convert RuleResult → ActionableWarning
   e. Add `sourceNodeId` to warnings so they appear in per-node editors
   f. Add `actions` with `GraphMutation[]` so warnings are actionable
   g. Write tests with FileScienceProvider

7. **No human text in `/science/`**: only `messageKey`, `labelKey`, `titleKey`. Text lives in `/commons/i18n/`.

8. **Schema**: all blocks must follow `cookingsciencebrain.schema.json`.

9. **No legacy**: do not keep hardcoded "fallback" versions. If the logic is in JSON, the TypeScript code reads it from JSON. Period.
