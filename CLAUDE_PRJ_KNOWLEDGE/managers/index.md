# Manager Directory — Table of Contents

> All managers live in `commons/utils/`. They are **PURE functions**: no DB, no state, no side effects.
> Domain managers take `provider: ScienceProvider` as first parameter — **no exceptions**.
> All warnings use `messageKey` + `messageVars` — **never hardcoded text** — resolved via `t()` at the UI layer.

## Architecture

```
CLIENT (React/Expo) → oRPC API (auth) → Manager (pure) → ScienceProvider (/science/ JSON)
```

- **Client** = UI + local state (Zustand). Imports `format.ts` for display helpers only.
- **Server** = oRPC procedures call Managers directly (no ORM, no side effects).
- **Managers** = pure functions. Input → output. No DB, no state.
- **Science** = declarative JSON in `/science/`. Formulas, rules, catalogs, classifications.

---

## Inventory by Category

### Dough Layer (core recipe graph)

| Manager | File | Science | Status | Doc |
|---------|------|---------|--------|-----|
| DoughManager | `dough-manager.ts` | Yes | Complete | [dough-manager.md](dough-manager.md) |
| FlourManager | `flour-manager.ts` | Yes | Complete | [flour-manager.md](flour-manager.md) |
| RiseManager | `rise-manager.ts` | Yes | Complete | [rise-manager.md](rise-manager.md) |
| BakeManager | `bake-manager.ts` | Yes | Complete | [bake-manager.md](bake-manager.md) |
| PreBakeManager | `pre-bake-manager.ts` | Yes | Complete | [pre-bake-manager.md](pre-bake-manager.md) |
| PreFermentManager | `pre-ferment-manager.ts` | Yes | Complete | [pre-ferment-manager.md](pre-ferment-manager.md) |
| PortioningManager | `portioning-manager.ts` | No | Complete | [portioning-manager.md](portioning-manager.md) |
| IngredientManager | `ingredient-manager.ts` | No | Complete | [ingredient-manager.md](ingredient-manager.md) |
| ScheduleManager | `schedule-manager.ts` | No | Complete | [schedule-manager.md](schedule-manager.md) |

### Graph Infrastructure

| Manager | File | Science | Status | Doc |
|---------|------|---------|--------|-----|
| GraphManager | `graph-manager.ts` | No | Complete | [graph-manager.md](graph-manager.md) |
| RecipeAutoCorrectManager | `recipe-auto-correct-manager.ts` | Indirect | Complete | [recipe-auto-correct-manager.md](recipe-auto-correct-manager.md) |
| FermentationCoherenceManager | `fermentation-coherence-manager.ts` | Yes | Complete | [fermentation-coherence-manager.md](fermentation-coherence-manager.md) |
| PanoramicaManager | `panoramica-manager.ts` | Placeholder | Complete | [panoramica-manager.md](panoramica-manager.md) |

### Additional Layers (multi-layer system)

| Manager | File | Science | Status | Doc |
|---------|------|---------|--------|-----|
| SauceManager | `sauce-manager.ts` | Yes | Complete | [sauce-manager.md](sauce-manager.md) |
| PastryManager | `pastry-manager.ts` | Yes | Complete | [pastry-manager.md](pastry-manager.md) |
| FermentLayerManager | `ferment-layer-manager.ts` | Yes | Complete | [ferment-layer-manager.md](ferment-layer-manager.md) |
| PrepLayerManager | `prep-layer-manager.ts` | Yes | Complete | [prep-layer-manager.md](prep-layer-manager.md) |
| FermentManager | `ferment-manager.ts` | Scaffold | Scaffold | [ferment-manager.md](ferment-manager.md) |
| PrepManager | `prep-manager.ts` | Scaffold | Scaffold | [prep-manager.md](prep-manager.md) |

---

## Dependency Hierarchy

```
format.ts (lowest — no deps)
  ↑
flour-manager.ts → FlourCatalog
  ↑
dough-manager.ts → DoughDefaults (re-exports flour-manager)
  ↑
rise-manager.ts, pre-ferment-manager.ts, portioning-manager.ts
  ↑
graph-reconciler.service.ts (orchestrator — calls all managers)
  ↑
graph-mutation-engine.ts (pure graph/portioning mutations)
  ↑
recipe-auto-correct-manager.ts (iterative solver — calls reconciler + mutation engine)

Layer managers (sauce, pastry, ferment-layer, prep-layer):
  → consumed by layer-specific UI configs and panoramica-manager
```

---

## Key Rules

1. **i18n MANDATORY**: all `messageKey`, never hardcoded strings — in BOTH `en` and `it`
2. **ScienceProvider as first param** for any domain logic function
3. **Warnings return** `RuleResult { messageKey, messageVars }` or `ActionableWarning`
4. **Scientific refs**: `[C]` Casucci, `[M]` Modernist Pizza — in JSDoc
5. **Pure functions only**: no DB, no state, no side effects

---

## Guides

- [How to Create a New Manager](how-to-create-new-manager.md) — scaffold, Science connection, checklist
- [Scaffold Managers](scaffold-managers.md) — FermentManager & PrepManager status and roadmap
