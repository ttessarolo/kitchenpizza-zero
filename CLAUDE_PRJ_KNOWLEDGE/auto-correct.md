# RecipeAutoCorrectManager — Iterative Constraint Solver

### Problem

Recipe warnings are **interdependent**: fixing one warning (e.g., reducing a rise duration to match flour W capacity) often resolves 2-3 other warnings (fermentation mismatch, yeast mismatch) as a cascade. A naive "apply each fix independently" approach fails because:

1. Fixes reference stale context (`_ctx`) after the first mutation changes the graph
2. Some warnings are **consequences** of the same root cause — fixing the root resolves all
3. A fix can create NEW warnings that need further resolution

### Solution: Iterative Constraint Solver

**File:** `commons/utils/recipe-auto-correct-manager.ts`

The `autoCorrectGraph()` function is a pure, iterative solver that:

```
for each round (up to maxRounds):
  1. reconcileGraph() → collect all warnings
  2. Sort warnings by priority TIER (structural first)
  3. Apply highest-priority fix via pure mutation engine
  4. reconcileGraph() again → verify improvement
  5. If warning count decreased → COMMIT, continue
     If warning count unchanged → SKIP this fix, try next
     If max rounds reached → STOP, report 'ko'
```

### Warning Priority Tiers

The solver applies fixes in scientifically-grounded priority order:

| Tier | Warnings | Rationale | Scientific Basis |
|------|----------|-----------|-----------------|
| 1 | `flour_w_max_rise` (per-node) | Fix individual rise durations first — root cause | [C] Cap. 39: W determines max fermentation window |
| 2 | `equivalent_time_exceeds_w_capacity`, `rise_phases_insufficient` | Graph-level aggregate after individual fixes | [C] Cap. 39: W capacity is absolute ceiling |
| 3 | `total_fermentation_mismatch`, `yeast_portioning_mismatch` | Sync portioning to match graph — often auto-resolved by Tier 1 | [C] Cap. 44: Formula L ties yeast% to hours |
| 4 | `cold_rise_too_long`, `acclimatization_missing` | Sequence/timing constraints — independent | [C] Cap. 31: 72h fridge limit, thermal shock |
| 5 | All dough composition warnings | Independent range checks — fix in any order | Various |

**Key insight:** Tier 1 fixes are **root causes**. Tier 2-3 warnings are often **consequences** that auto-resolve when Tier 1 is fixed. The solver exploits this dependency hierarchy.

### Configuration

```typescript
interface AutoCorrectConfig {
  autoCorrect: boolean                    // true = apply; false = analyze only
  reasoningLevel: 'low' | 'medium' | 'high'  // max rounds: 3 / 6 / 10
}
```

- **`autoCorrect: false`** — Returns sorted/analyzed warnings without modifying graph. Useful for "suggest but don't apply" UX.
- **`reasoningLevel`** — Controls max iterations. `medium` (5 rounds) handles most recipes. `high` (8) for complex multi-dough graphs.

### Report Structure

```typescript
interface AutoCorrectReport {
  status: 'ok' | 'ko'                    // all resolved or some remain
  steps: AutoCorrectStep[]               // what was tried, outcome per round
  warningsResolved: number
  warningsRemaining: ActionableWarning[]
  roundsUsed: number
  maxRounds: number
}
```

Each step records: `round`, `warningId`, `outcome` ('applied' | 'skipped'), `warningsBefore`, `warningsAfter`. This enables the UI to show a summary banner and, in the future, a detailed step-by-step explanation.

### Pure Mutation Engine

**File:** `commons/utils/graph-mutation-engine.ts`

Extracted from the store to enable pure (no-React, no-Zustand) graph mutations:

- `resolveNodeRef(ref, sourceNodeId, nodes, edges)` — walks edges to resolve `self`, `upstream_dough`, `downstream_rise`, etc.
- `resolvePatchValues(patch, nodeId, nodes, warning)` — resolves `_contextRef:key` and `_key` from `warning._ctx` and `messageVars`
- `applyWarningActionPure(warning, actionIdx, graph, portioning)` — applies all mutations from one action, returns new graph + portioning

Handles all mutation types: `updateNode`, `updatePortioning`, `addNodeAfter`, `removeNode`.

### Integration

**Store (`recipe-flow-store.ts`):**
- `applyWarningAction(warning, idx)` → calls `applyWarningActionPure()` then `applyMutation()` for UI sync
- `applyAllWarningActions()` → calls `autoCorrectGraph()` with `{ autoCorrect: true, reasoningLevel: 'medium' }`, stores report in `autoCorrectReport`

**UI (`DoughCompositionPanel.tsx`):**
- Shows `ActionableWarningBox` with deduplicated warnings + "Apply All" button
- After auto-correct, shows report banner (green OK / amber KO) with summary

**Programmatic (future oRPC):**
- `autoCorrectGraph()` is a pure function — can be called from an oRPC procedure for headless recipe adaptation

### Decisions

1. **One fix per round** — The solver applies only the highest-priority fix per round, then re-reconciles. This ensures each subsequent fix sees fresh state and `_ctx`. Multi-fix-per-round was rejected because `_ctx` becomes stale after the first mutation.

2. **Skip on no improvement** — If a fix doesn't reduce the warning count, it's added to `skippedIds` and not retried. This prevents infinite loops and correctly handles warnings whose suggested action is unhelpful (e.g., `equivalent_time_exceeds_w_capacity` action sets `doughHours` but doesn't change node durations).

3. **SkippedIds in final status** — The 'ok'/'ko' determination excludes skipped warnings. If all resolvable issues are fixed but some un-fixable warnings remain, the report still shows 'ok'.

4. **Pure mutation engine shared** — Both the store (single-action click) and the auto-correct manager (iterative solver) use the same `graph-mutation-engine.ts`. No logic duplication.

5. **`_contextRef:` resolution** — Science JSON rules use `_contextRef:keyName` format in mutation patches. The engine strips the prefix and looks up the value in `warning._ctx`, with fallback to `messageVars`.

### Future Improvements

1. **Alternative actions** — At `high` reasoningLevel, try `action[1]` if `action[0]` fails (some warnings offer multiple fix strategies)
2. **Multi-step combinations** — Detect when two fixes must be applied together (e.g., change flour type AND adjust hours simultaneously)
3. **Flour suggestion** — When `equivalent_time_exceeds_w_capacity` fires, suggest a stronger flour from the catalog that matches the target fermentation hours
4. **Phase redistribution** — Instead of just reducing individual rise durations, redistribute total fermentation time across phases optimally (use `suggestPhaseRedistribution()` from FermentationCoherenceManager)
5. **Programmatic API** — Expose `autoCorrectGraph()` via oRPC procedure for headless recipe adaptation ("adapt this recipe to my flour/schedule")
6. **User preference learning** — Track which fixes the user accepts vs. rejects, adjust priority ordering over time
7. **Rollback granularity** — Currently skips on no improvement; could try partial rollback (undo last fix, try alternative) for more sophisticated solving
8. **Conflict detection** — Pre-analyze which fixes conflict with each other before applying, to avoid wasted rounds
9. **reasoningLevel expansion** — Beyond max iterations: control whether to consider cross-domain fixes (e.g., change flour to fix fermentation, not just reduce hours)
