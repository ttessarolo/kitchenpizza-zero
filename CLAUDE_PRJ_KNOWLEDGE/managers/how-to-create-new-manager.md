# How to Create a New Manager

> Every manager with domain knowledge **MUST** use ScienceProvider. No exceptions.
> Every user-visible string **MUST** use i18n keys. No hardcoded text.

## When to Create a Manager

**Create a Manager when:**
- Logic involves scientific formulas or domain constants
- Logic is shared between web and native
- Logic has configurable parameters (ranges, thresholds, profiles)
- Logic needs validation and warnings

**Keep inline when:**
- Pure UI formatting (use `format.ts`)
- One-off component logic that won't be reused
- Simple derivations from existing state

---

## Step-by-Step Scaffold

### Step 1: Create the Manager File

`commons/utils/{domain}-manager.ts`

```typescript
import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
// import { evaluateFormula } from './science/formula-engine'  // if needed
// import { evaluatePiecewise } from './science/formula-engine' // if needed

/**
 * {DomainName}Manager — {one-line purpose}
 *
 * Pure functions. No DB, no state, no side effects.
 * All science from ScienceProvider.
 *
 * Scientific references:
 * [C] Casucci "La Pizza è un Arte" (2020) — Cap. XX
 * [M] Modernist Pizza Vol. 4 — Section XX
 */

/** Default configuration per subtype */
export function getDefaults(subtype: string): {DomainConfig} {
  // ...
}

/** Core calculation — always takes provider as first param */
export function calc{Something}(
  provider: ScienceProvider,
  // ... domain inputs
): {ReturnType} {
  // Use provider.getFormula(), provider.getFactorChain(), etc.
}

/** Validation via science rules */
export function validate{Something}(
  provider: ScienceProvider,
  config: {ConfigType},
): RuleResult[] {
  const rules = provider.getRules('{domain}_validation')
  return evaluateRules(rules, { /* context vars */ })
}

/** Advisory warnings — returns RuleResult with messageKey, NEVER text */
export function get{Domain}Warnings(
  provider: ScienceProvider,
  profile: {ProfileType},
): RuleResult[] {
  const rules = provider.getRules('{domain}')
  return evaluateRules(rules, { /* context vars */ })
}
```

**Key constraints:**
- `provider: ScienceProvider` is ALWAYS the first parameter for domain logic functions
- Export ONLY pure functions (no side effects, no DB, no state)
- Document scientific references in JSDoc (`[C] Cap. XX`, `[M] Section`)
- Follow the pattern: `getDefaults()`, `calc*()`, `validate*()`, `getWarnings()`

### Step 2: Create Science Blocks

Create JSON files in `/science/` following `cookingsciencebrain.schema.json`:

- **Formulas**: `/science/formulas/{domain}-*.json` — mathematical expressions (expr-eval)
- **Rules**: `/science/rules/{domain}-warnings.json` — advisory/warning conditions
- **Catalogs**: `/science/catalogs/{domain}-types.json` — data tables
- **Classifications**: `/science/classifications/{domain}-*.json` — categorization
- **Defaults**: `/science/defaults/{domain}.json` — per-type/subtype config

Every block needs `_meta`:
```json
{
  "_meta": {
    "section": "{domain}",
    "displayName": "...",
    "description": "...",
    "tags": ["{domain}", "..."]
  }
}
```

**All message strings as `messageKey`** — never resolved text in JSON.

### Step 3: Add i18n Keys

Add keys to BOTH files:
- `commons/i18n/en/science.json` — English (base language)
- `commons/i18n/it/science.json` — Italian

Key pattern: `science.{domain}.{rule_id}` for warnings.

**EVERY user-visible string must be a key** — this includes:
- Warning messages
- Validation errors
- Labels, descriptions, tooltips
- Enum display names

### Step 4: Create Types (if needed)

In `commons/types/` — **never inline types in source files**.

- Config types for the domain (e.g., `SauceMasterConfig`)
- If part of multi-layer system, add to `commons/types/recipe-layers.ts`

### Step 5: Wire to Reconciler / Store

If the manager participates in recipe graph reconciliation:
- Add calls in `graph-reconciler.service.ts` at the appropriate phase
- Add to `recipe-flow-store.ts` if it has UI state
- Add cross-node validation (see `CLAUDE_PRJ_KNOWLEDGE/cross-node-validation.md`)

### Step 6: Write Tests

`tests/{domain}-manager.test.ts`

```typescript
import { FileScienceProvider } from '@commons/utils/science/science-provider'

const provider = new FileScienceProvider()

describe('{DomainManager}', () => {
  // Test every exported function
  // Test edge cases (empty input, zero values, extremes)
  // Verify formulas against scientific literature
  // Use helpers from tests/synthetic_data/helpers.ts
})
```

### Step 7: Create oRPC Procedure (if exposed to API)

- Thin handler in `app/server/procedures/{domain}.ts`
- Zod schemas in `app/server/schemas/{domain}.ts`
- Register in `app/server/router.ts`:
  ```typescript
  {domain}: os.router({ action1, action2 }),
  ```

---

## Pre-Merge Checklist

- [ ] `provider: ScienceProvider` on every domain function
- [ ] Zero hardcoded text in warnings (all `messageKey`)
- [ ] i18n keys in BOTH `en` and `it` JSON files
- [ ] Science blocks follow `cookingsciencebrain.schema.json`
- [ ] Tests pass with `FileScienceProvider`
- [ ] Scientific references in JSDoc (`[C]`, `[M]`)
- [ ] Types in `commons/types/`, not inline
- [ ] Documentation added to `CLAUDE_PRJ_KNOWLEDGE/managers/{domain}-manager.md`
- [ ] Index updated in `CLAUDE_PRJ_KNOWLEDGE/managers/index.md`

---

## Reference

- Science system: `CLAUDE_PRJ_KNOWLEDGE/science-brain.md`
- Cross-node validation: `CLAUDE_PRJ_KNOWLEDGE/cross-node-validation.md`
- Existing manager examples: `dough-manager.ts` (richest), `sauce-manager.ts` (clean mid-complexity)
