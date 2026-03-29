# Manager Architecture — Business Logic Layer

All algorithmic/scientific business logic is centralized in **Managers** — pure functions in `commons/utils/` with declarative configuration from `local_data/`. The client (store, components) is a thin UI layer. Managers are exposed via **oRPC procedures** under authentication.

### Architecture

```
CLIENT (React/Expo) → oRPC API (auth) → Manager (pure function) → Config (local_data/)
```

- **Client** = UI + local state (Zustand). Imports `format.ts` for display helpers only.
- **Server** = oRPC procedures call Managers directly (no ORM, no side effects).
- **Managers** = pure functions. Input → output. No DB, no state, no side effects.
- **Config** = declarative TS/JSON in `local_data/`. Scientific constants, ranges, catalogs.

### Manager Inventory

| Manager | File | CookingScienceBrain | Domain |
|---------|------|:---:|--------|
| **DoughManager** | `dough-manager.ts` | Yes | Formulas, rules, defaults |
| **FlourManager** | `flour-manager.ts` | Yes | Classification, catalog |
| **RiseManager** | `rise-manager.ts` | Yes | Factor chain, piecewise, rules |
| **BakeManager** | `bake-manager.ts` | Yes | Rules (advisories) |
| **PreBakeManager** | `pre-bake-manager.ts` | Yes | Rules (advisories, validation) |
| **PreFermentManager** | `pre-ferment-manager.ts` | Yes | Rules (validation) |
| **AdvisoryManager** | *(deleted)* | — | Replaced by science/rule-engine.ts |
| **WarningManager** | *(deleted)* | — | Was deprecated wrapper |
| **GraphManager** | `graph-manager.ts` | — | Pure topology |
| **PortioningManager** | `portioning-manager.ts` | — | Pure math |
| **IngredientManager** | `ingredient-manager.ts` | — | Pure aggregation |
| **ScheduleManager** | `schedule-manager.ts` | — | Pure timeline |
| **RecipeAutoCorrectManager** | `recipe-auto-correct-manager.ts` | Yes | Iterative constraint solver |
| **GraphMutationEngine** | `graph-mutation-engine.ts` | — | Pure graph/portioning mutations |

### Dependency Hierarchy

```
format.ts (lowest — no deps)
  ↑
flour-manager.ts → FlourCatalog
  ↑
dough-manager.ts → DoughDefaults
  ↑
rise-manager.ts → RiseMethods
pre-ferment-manager.ts
portioning-manager.ts
  ↑
graph-reconciler.service.ts (orchestrator — calls all managers)
  ↑
graph-mutation-engine.ts (pure graph/portioning mutations)
  ↑
recipe-auto-correct-manager.ts (iterative solver — calls reconciler + mutation engine)
```

### How to Create a New Manager

1. **Create the manager** in `commons/utils/{domain}-manager.ts`:
   - Export ONLY pure functions (no side effects, no DB, no state)
   - Import config from `local_data/{domain}-config.ts`
   - Document scientific references in JSDoc (`[C] Cap. XX`, `[M] Section`)
   - Follow the pattern: `getDefaultConfig()`, `calculate()`, `validate()`, `getWarnings()`

2. **Create the config** in `local_data/{domain}-config.ts`:
   - Declarative arrays/objects with scientific parameters
   - Use `as const satisfies ReadonlyArray<Type>` for type safety
   - Include source citations in comments

3. **Create oRPC procedure** in `app/server/procedures/{domain}.ts`:
   - Use `baseProcedure` (no auth) for pure calculations
   - Use `authProcedure` for user-specific operations
   - Handler = thin wrapper calling the manager

4. **Create Zod schemas** in `app/server/schemas/{domain}.ts`:
   - Input/output schemas for each procedure
   - Keep intentionally loose for flexibility (manager handles validation)

5. **Register in router** (`app/server/router.ts`):
   ```typescript
   import { action1, action2 } from './procedures/{domain}'
   // In appRouter:
   {domain}: os.router({ action1, action2 }),
   ```

6. **Write tests** in `tests/{domain}-manager.test.ts`:
   - Test every public function
   - Test edge cases (empty input, zero values, extremes)
   - Verify scientific formulas against literature
   - Use existing helpers from `tests/synthetic_data/helpers.ts`

7. **Client usage**:
   - Display helpers → import from `@commons/utils/format`
   - Business logic → via oRPC (`orpc.{domain}.{action}.useQuery()`)
   - Static catalogs → direct import from `@/local_data/` (staleTime: Infinity)

### When to Create a Manager vs. Inline Logic

**Create a Manager when:**
- Logic involves scientific formulas or domain constants
- Logic is shared between web and native
- Logic has configurable parameters (ranges, thresholds, profiles)
- Logic needs validation and warnings

**Keep inline when:**
- Pure UI formatting (use `format.ts`)
- One-off component logic that won't be reused
- Simple derivations from existing state

### Scientific Validation

Every formula in a Manager MUST reference its scientific source:
- **[C]** = Casucci "La Pizza è un Arte" (2020) — chapters 01-69
- **[M]** = Modernist Pizza Vol. 4 — sections by topic
- Use the `bread-knowledge` skill to verify formulas against literature
