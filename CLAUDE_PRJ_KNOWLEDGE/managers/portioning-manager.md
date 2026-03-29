# PortioningManager

> **File:** `commons/utils/portioning-manager.ts`
> **Science:** No
> **Status:** Complete

## Purpose

Centralized portioning, weight, and scaling logic. Calculates target dough weight from user portioning settings (tray or ball mode), computes graph-wide ingredient totals, and scales ingredient weights uniformly or selectively (hydration-only). Portioning is the user's source of truth -- the reconciler never overwrites it.

## Philosophy

All functions are pure -- they return new objects without mutation. No ScienceProvider dependency. Uses `rnd()` from `format.ts` for consistent rounding. The key invariant is that portioning drives scaling: target weight is derived from portioning, then a factor is applied to all nodes.

## Exported Functions

| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `calcTargetWeight` | `(portioning: Portioning) => number` | No | Target dough weight: tray mode (l*w*thickness*count) or ball mode (weight*count) |
| `getNodeTotalWeight` | `(data: NodeData) => number` | No | Sum all ingredient weights in a single node (flours+liquids+extras+yeasts+salts+sugars+fats) |
| `computeGraphTotals` | `(graph: RecipeGraph) => GraphTotals` | No | Sum ingredient totals across all dough/pre_ferment nodes; derives hydration % |
| `scaleNodeData` | `(data: NodeData, factor: number) => NodeData` | No | Scale all ingredient grams in a node by a factor; preserves unit-based extras |
| `scaleAllNodes` | `(nodes: RecipeNode[], newTotal, currentTotal) => RecipeNode[]` | No | Uniform scaling of all nodes to match a new total dough weight |
| `scaleToHydration` | `(nodes: RecipeNode[], targetHydration: number) => RecipeNode[]` | No | Scale only liquids to reach a target hydration %, leaving flour unchanged |
| `applyPortioning` | `(graph: RecipeGraph, newPortioning: Portioning) => { graph, factor }` | No | Canonical portioning operation: compute target, compute totals, scale graph |

## Exported Types

- `GraphTotals` -- totalFlour, totalLiquid, totalExtras, totalYeast, totalSalt, totalSugar, totalFat, totalDough, currentHydration

## Key Formulas & Algorithms

- **Tray mode:** `l * w * thickness * count` (cm^3 approximates grams)
- **Ball mode:** `weight * count`
- **Hydration:** `(totalLiquid / totalFlour) * 100`
- **Scaling factor:** `newTotal / currentTotal` applied to all ingredient grams
- **Hydration scaling:** only liquid factor = `(totalFlour * targetHydration / 100) / totalLiquid`

## Warnings & i18n

No warnings produced. Pure calculation only.

## Dependencies

### Imports From
- `@commons/types/recipe-graph` -- RecipeGraph, RecipeNode, NodeData
- `@commons/types/recipe` -- Portioning
- `./format` -- rnd

### Depended On By
- `app/server/services/graph-reconciler.service.ts` -- scaleNodeData
- `app/server/procedures/portioning.ts` -- calcTargetWeight
- `tests/portioning-manager.test.ts`, `tests/total-dough-lock.test.ts`

## How to Evolve

- Add per-node scaling modes (e.g., lock a node's weight while scaling others)
- Support non-linear scaling for enriched doughs (fat inhibits volume differently)
- Add `DOUGH_NODE_TYPES` to a shared constant if more node types need to contribute to totals
