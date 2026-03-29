# ScheduleManager

> **File:** `commons/utils/schedule-manager.ts`
> **Science:** No
> **Status:** Complete

## Purpose
Centralized timeline and scheduling logic for recipe graphs. Computes per-node start/end times using topological sort and edge time ratios, derives total recipe duration, and produces a time summary broken down by phase category (prep, rise, bake).

## Philosophy
Pure functions operating on `RecipeGraph` data. No ScienceProvider needed -- scheduling is purely algorithmic (graph traversal). Delegates topological sort to `graph-manager` and lane derivation to `lane-derivation`. No DB, no side effects.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `deriveLanes` | re-export from `./lane-derivation` | No | Lane derivation from graph topology (re-exported) |
| `getNodeDuration` | `(node: RecipeNode) => number` | No | Effective duration = `baseDur + restDur` in minutes |
| `computeSchedule` | `(graph: RecipeGraph) => Schedule` | No | Compute start/end times for all nodes via topological sort + edge `scheduleTimeRatio`. Returns nodes with durations and total span |
| `computeTimeSummary` | `(nodesWithDur, span) => TimeSummary` | No | Aggregate durations by node type into `{ total, prep, rise, bake }` |
| `totalDuration` | `(graph: RecipeGraph) => number` | No | Shorthand: total recipe duration in minutes (calls `computeSchedule`) |

## Exported Types
| Type | Description |
|------|-------------|
| `NodeWithDuration` | `RecipeNode & { dur: number }` |
| `Schedule` | `{ nodes: NodeWithDuration[], span: number }` |
| `TimeSummary` | `{ total, prep, rise, bake }` (all in minutes) |

## Key Formulas & Algorithms

**Schedule computation:**
1. Topological sort of the graph.
2. For each node, find the earliest start time considering all incoming edges: `parentStart + (parentEnd - parentStart) * edge.scheduleTimeRatio`.
3. Node end = start + duration in milliseconds.
4. Span = max end time - epoch origin.

**Time summary categories:**
- `prep` = pre_dough + pre_ferment + dough + rest + shape + prep
- `rise` = rise
- `bake` = bake + post_bake

## Warnings & i18n
No warnings produced. This is a pure computation manager.

## Dependencies
### Imports From
- `@commons/types/recipe-graph` (RecipeGraph, RecipeNode)
- `./graph-manager` (topologicalSortGraph)
- `./lane-derivation` (deriveLanes, re-exported)

### Depended On By
- `app/server/procedures/schedule.ts`
- `tests/schedule-manager.test.ts`

## How to Evolve
- Add cross-layer scheduling by accepting multiple graphs and cross-layer edges, merging into a unified timeline.
- Add calendar-aware scheduling (specific date/time targets) by offsetting the epoch origin.
- Add parallel node support by tracking per-lane concurrency.
