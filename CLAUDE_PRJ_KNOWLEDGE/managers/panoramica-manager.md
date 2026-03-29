# PanoramicaManager

> **File:** `commons/utils/panoramica-manager.ts`
> **Science:** Scaffold
> **Status:** Complete

## Purpose
Orchestrates the multi-layer recipe overview ("Panoramica"). Computes a unified view across all layers and cross-layer edges, calculating critical-path durations per layer and generating a time-ordered execution timeline. Designed for the multi-layer recipe architecture.

## Philosophy
Pure graph algorithms. Accepts `ScienceProvider` for future extensibility but does not currently use it (parameter is prefixed with `_`). Operates on `RecipeLayer[]` and `CrossLayerEdge[]`. No DB, no side effects.

## Exported Functions
| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `computePanoramica` | `(_provider, layers, crossEdges) => PanoramicaResult` | No (scaffold) | Compute per-layer critical path, cross-dependencies, total duration (max across layers), and identify the critical layer |
| `generateTimeline` | `(panoramica, targetCompletionTime) => TimelineStep[]` | No | Generate backward-scheduled timeline from target completion time. Each layer finishes at or before target |

## Exported Types
| Type | Description |
|------|-------------|
| `LayerSummary` | `{ layerId, layerType, name, nodeCount, totalDuration, criticalPath }` |
| `CrossDependency` | `{ edgeId, sourceLayerId, sourceNodeId, targetLayerId, targetNodeId, label }` |
| `PanoramicaResult` | `{ layers, crossDependencies, totalDuration, criticalLayerId }` |
| `TimelineStep` | `{ time, layerId, nodeId, nodeTitle, duration, type }` |

## Key Formulas & Algorithms

**Critical path (per layer):**
1. Build adjacency list and in-degree map from layer nodes/edges.
2. Topological sort with longest-path tracking: `dist[neighbor] = max(dist[neighbor], dist[current] + neighborDur)`.
3. Reconstruct path by following `prev` pointers from the node with maximum distance.

**Total duration:** `max(layer.totalDuration)` across all layers (parallel execution model).

**Timeline generation:**
1. For each layer: `layerStart = targetCompletionTime - layer.totalDuration`.
2. Walk critical path nodes, spacing them evenly across `layerStart -> target`.
3. Sort all steps by time ascending.

Note: `generateTimeline` currently uses placeholder durations and evenly-spaced node times. The caller is expected to resolve actual node titles and durations.

## Warnings & i18n
No warnings produced. This is a pure computation manager. Future science integration could add cross-layer coherence warnings.

## Dependencies
### Imports From
- `./science/science-provider` (ScienceProvider -- unused, for future)
- `@commons/types/recipe-layers` (RecipeLayer, CrossLayerEdge)

### Depended On By
- `app/stores/recipe-flow-store.ts`
- `app/components/recipe-flow/PanoramicaSummaryPanel.tsx`
- `tests/panoramica-computation.test.ts`

## How to Evolve
- **Cross-layer edge scheduling:** Currently layers are treated as independent (parallel). Cross-layer edges should add dependency constraints to timeline generation.
- **Science integration:** Use `ScienceProvider` for cross-layer coherence rules (e.g., sauce layer must finish before bake layer starts).
- **Resolve node titles/durations:** `generateTimeline` currently uses placeholder `nodeTitle` and `duration: 0`. Enrich with actual node data.
- **Gantt chart data:** Extend `TimelineStep` with lane/row info for visual rendering.
