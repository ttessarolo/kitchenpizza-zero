# GraphManager

> **File:** `commons/utils/graph-manager.ts`
> **Science:** No
> **Status:** Complete

## Purpose

Centralized pure graph operations for the recipe DAG. Provides topology queries (parents, children, ancestors, descendants), topological sort via Kahn's algorithm, node addition with edge re-routing, node data updates, and structural validation (cycles, orphans, edge integrity, split percentages).

## Philosophy

All functions are pure -- they return new graph objects without mutation. No ScienceProvider dependency. This is the lowest-level graph primitive layer; higher-level managers (schedule, reconciler) build on top of these operations.

## Exported Functions

| Function | Signature (simplified) | Science | Description |
|----------|----------------------|---------|-------------|
| `getNodeTotalWeight` | `(data: NodeData) => number` | No | Sum all ingredient weights in a node's data |
| `getParentIds` | `(nodeId, edges) => string[]` | No | Source nodes of edges targeting this node |
| `getChildNodeIds` | `(nodeId, edges) => string[]` | No | Target nodes of edges sourced from this node |
| `getAncestorNodeIds` | `(nodeId, edges) => Set<string>` | No | All transitive parents via BFS |
| `getDescendantNodeIds` | `(nodeId, edges) => Set<string>` | No | All transitive children via BFS |
| `topologicalSortGraph` | `(graph: RecipeGraph) => RecipeNode[]` | No | Kahn's algorithm topological sort; short result indicates a cycle |
| `validateGraph` | `(graph: RecipeGraph) => GraphValidationResult` | No | Structural validation: dangling edges, invalid ratios, split sums, orphans, cycles |
| `addNodeToGraph` | `(graph, afterNodeId, type, subtype?) => { graph, newNodeId }` | No | Insert a node after an existing one, re-routing outgoing edges through the new node |
| `updateNodeData` | `(graph, nodeId, patch) => RecipeGraph` | No | Merge a partial patch into a node's data |

## Exported Types

- `GraphValidationResult` -- { valid: boolean, errors: string[] }

## Key Formulas & Algorithms

- **Topological sort:** Kahn's algorithm -- compute in-degrees, process zero-in-degree nodes, decrement neighbors. If sorted count < node count, graph has a cycle.
- **Node insertion:** Outgoing edges from `afterNode` are re-routed to originate from the new node, and a new edge connects `afterNode -> newNode`.

## Warnings & i18n

`validateGraph` returns plain English error strings (not i18n keys). These are developer-facing diagnostics, not user-facing warnings.

## Dependencies

### Imports From
- `@commons/types/recipe-graph` -- RecipeGraph, RecipeNode, RecipeEdge, NodeData, NodeTypeKey

### Depended On By
- `commons/utils/schedule-manager.ts` -- topologicalSortGraph
- `tests/graph-manager.test.ts`

## How to Evolve

- Add `removeNodeFromGraph` (with edge re-routing or collapse)
- Add lane-aware positioning for multi-lane graphs
- Extract validation into a separate `graph-validator.ts` if rules grow
- Add edge manipulation functions (add/remove/update edge)
