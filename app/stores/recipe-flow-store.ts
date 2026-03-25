import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react'
import type {
  RecipeV2,
  RecipeGraph,
  RecipeNode,
  RecipeEdge,
  LaneDefinition,
  NodeTypeKey,
  NodeData,
} from '@commons/types/recipe-graph'
import type { RecipeMeta, Portioning, TemperatureUnit, RecipeStep } from '@commons/types/recipe'
import { autoLayout } from '~/lib/auto-layout'
import { removeNodeFromGraph, getNodeTotalWeight } from '@commons/utils/graph-utils'
import {
  rnd,
  getStepTotalWeight,
  getChildIds,
  recalcPreFermentIngredients,
  adjustDoughForPreFerment,
  reconcilePreFerments,
} from '@commons/utils/recipe'
import { graphToRecipeV1, nodeToStep, stepToNodeData } from '@commons/utils/graph-adapter'
import { computeGraphTotals, scaleNodeData } from '~/hooks/useGraphCalculator'
import { generateDoughGraph } from '~/lib/generate-dough'
import { RECIPE_SUBTYPES } from '@/local_data'
import { getDoughDefaults } from '@/local_data/dough-defaults'
import { calcYeastPct } from '@commons/utils/yeast-calculator'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import type { RecipeWarning } from '@commons/utils/warning-manager'
import type { BaseNodeData } from '~/components/recipe-flow/nodes/BaseNode'
import { getNodeDuration } from '~/hooks/useGraphCalculator'

// ── Convert RecipeNode to React Flow Node ───────────────────────

function toFlowNode(
  n: RecipeNode,
  duration: number,
  onExpand: (id: string) => void,
): Node<BaseNodeData> {
  return {
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      nodeData: n.data,
      nodeType: n.type,
      nodeSubtype: n.subtype,
      duration,
      onExpand,
    },
  }
}

function toFlowEdge(e: RecipeEdge): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    type: 'recipe',
    data: e.data,
  }
}

// ── Store interface ─────────────────────────────────────────────

interface RecipeFlowState {
  // Raw recipe data
  meta: RecipeMeta
  portioning: Portioning
  ingredientGroups: string[]
  graph: RecipeGraph
  lanes: LaneDefinition[]

  // React Flow nodes/edges (derived from graph)
  flowNodes: Node<BaseNodeData>[]
  flowEdges: Edge[]

  // UI state
  selectedNodeId: string | null
  expandedNodeId: string | null
  peekNodeIds: string[]              // max 2 — CTRL+click panels
  lastAddedNodeId: string | null     // for undo toast
  undoSnapshot: { graph: RecipeGraph; portioning: Portioning } | null
  temperatureUnit: TemperatureUnit
  ambientTemp: number

  // React Flow callbacks
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect

  // Actions
  loadRecipe: (recipe: RecipeV2) => void
  setMeta: (fn: (m: RecipeMeta) => RecipeMeta) => void
  setPortioning: (fn: (p: Portioning) => Portioning) => void
  selectNode: (id: string | null) => void
  expandNode: (id: string | null) => void
  peekNode: (id: string) => void
  clearPeek: () => void
  closePeek: (id: string) => void
  closeAll: () => void
  undoLastAdd: () => void
  undo: () => void
  canUndo: boolean
  setTemperatureUnit: (u: TemperatureUnit) => void
  setAmbientTemp: (t: number) => void
  updateNodeCosmetic: (id: string, patch: Partial<NodeData>) => void  // title, desc — NO reconciliation
  updateNodeData: (id: string, patch: Partial<NodeData>) => void    // ingredients — WITH reconciliation
  updateNodeWithReconcile: (id: string, fn: (step: RecipeStep) => RecipeStep) => void

  // Edge actions
  updateEdgeData: (edgeId: string, patch: { scheduleTimeRatio?: number; scheduleQtyRatio?: number }) => void
  removeEdge: (edgeId: string) => void
  addDep: (nodeId: string, parentId: string) => void
  removeDep: (nodeId: string, parentId: string) => void
  updateDep: (nodeId: string, parentId: string, field: 'wait' | 'grams', value: number) => void  // v1 compat: 'wait'→scheduleTimeRatio, 'grams'→scheduleQtyRatio
  warnings: RecipeWarning[]
  selectedEdgeId: string | null
  edgeCalloutPos: { x: number; y: number } | null
  selectEdge: (id: string | null, pos?: { x: number; y: number }) => void
  scaleAllNodes: (newTotal: number) => void
  setGlobalHydration: (h: number) => void
  handlePortioningChangeWithScale: (np: Portioning) => void
  applyTypeDefaults: (typeKey: string, subtypeKey: string) => void
  resetRecipe: () => void
  generateDough: () => void
  addRootNode: (type: NodeTypeKey, subtype?: string | null) => void
  addNode: (afterNodeId: string, type: NodeTypeKey, subtype?: string | null) => void
  removeNode: (id: string) => void
  runAutoLayout: () => void
  toRecipeV2: () => RecipeV2
}

// ── Helper: sync flow nodes from graph ──────────────────────────

// Node types that REQUIRE at least one incoming edge to be valid
const REQUIRES_INPUT = new Set([
  'rise', 'shape', 'pre_bake', 'bake', 'post_bake', 'done', 'rest', 'join',
])

function syncFlowNodes(
  graph: RecipeGraph,
  meta: RecipeMeta,
  portioning: Portioning,
  onExpand: (id: string) => void,
  expandedNodeId?: string | null,
  peekNodeIds?: string[],
): Node<BaseNodeData>[] {
  const nodesWithIncoming = new Set(graph.edges.map((e) => e.target))

  // ── Phase 1: Topological sort (Kahn's) ──
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const n of graph.nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }
  for (const e of graph.edges) {
    if (adj.has(e.source)) adj.get(e.source)!.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
  }
  const topoQueue: string[] = []
  for (const [id, deg] of inDegree) { if (deg === 0) topoQueue.push(id) }
  const topoOrder: string[] = []
  while (topoQueue.length) {
    const id = topoQueue.shift()!
    topoOrder.push(id)
    for (const child of adj.get(id) || []) {
      const nd = (inDegree.get(child) || 1) - 1
      inDegree.set(child, nd)
      if (nd === 0) topoQueue.push(child)
    }
  }

  // ── Phase 2: Propagate cumulative weight along topo order ──
  const cumWeight = new Map<string, number>()       // total weight at each node
  const nodeInFlow = new Map<string, { label: string; grams: number }[]>()
  const nodeOutFlow = new Map<string, { label: string; grams: number }[]>()

  for (const nodeId of topoOrder) {
    const n = graph.nodes.find((x) => x.id === nodeId)
    if (!n) continue

    const ownWeight = getNodeTotalWeight(n.data)
    const inEdges = graph.edges.filter((e) => e.target === nodeId)

    // Compute IN: what flows in from each parent
    const inFlow: { label: string; grams: number }[] = []
    for (const e of inEdges) {
      const parent = graph.nodes.find((p) => p.id === e.source)
      if (!parent) continue

      let contribution = 0
      if (parent.type === 'split' && parent.data.splitOutputs && e.sourceHandle) {
        // From split: get the portion for this specific handle
        const output = parent.data.splitOutputs.find((o) => o.handle === e.sourceHandle)
        const parentCum = cumWeight.get(parent.id) || 0
        if (output && parent.data.splitMode === 'pct') {
          contribution = Math.round(parentCum * output.value / 100)
        } else if (output) {
          contribution = output.value // grams mode
        }
      } else {
        // Normal: inherit full cumulative weight of parent
        contribution = cumWeight.get(parent.id) || 0
      }

      if (contribution > 0) {
        const label = parent.type === 'split' && parent.data.splitOutputs && e.sourceHandle
          ? (parent.data.splitOutputs.find((o) => o.handle === e.sourceHandle)?.label || parent.data.title || 'Split')
          : (parent.data.title || parent.type)
        inFlow.push({ label, grams: contribution })
      }
    }

    const totalIn = inFlow.reduce((a, f) => a + f.grams, 0)
    const totalCum = ownWeight + totalIn
    cumWeight.set(nodeId, totalCum)
    nodeInFlow.set(nodeId, inFlow)

    // Compute OUT
    const outFlow: { label: string; grams: number }[] = []
    if (n.type === 'split' && n.data.splitOutputs) {
      for (const o of n.data.splitOutputs) {
        const g = n.data.splitMode === 'pct'
          ? Math.round(totalCum * o.value / 100)
          : o.value
        outFlow.push({ label: o.label, grams: g })
      }
    } else if (totalCum > 0) {
      outFlow.push({ label: n.data.title || n.type, grams: totalCum })
    }
    nodeOutFlow.set(nodeId, outFlow)
  }

  // ── Phase 3: Build React Flow nodes ──
  return graph.nodes.map((n) => {
    const dur = getNodeDuration(n, meta.type, meta.subtype, portioning.thickness)
    const fn = toFlowNode(n, dur, onExpand)
    fn.data.isSelected = n.id === expandedNodeId
    fn.data.isPeek = peekNodeIds?.includes(n.id) ?? false
    fn.data.isError = REQUIRES_INPUT.has(n.type) && !nodesWithIncoming.has(n.id)
    fn.data.inFlow = nodeInFlow.get(n.id) || []
    fn.data.outFlow = nodeOutFlow.get(n.id) || []
    return fn
  })
}

// ── Create store ────────────────────────────────────────────────

export const useRecipeFlowStore = create<RecipeFlowState>((set, get) => {
  /** Save current state as undo snapshot before any mutation */
  function saveSnapshot() {
    const s = get()
    set({
      undoSnapshot: {
        graph: JSON.parse(JSON.stringify(s.graph)),
        portioning: JSON.parse(JSON.stringify(s.portioning)),
      },
      canUndo: true,
    })
  }

  /**
   * Apply a mutation to the graph, then run the reconciliation engine.
   * This is THE central mutation point — all graph changes should go through here.
   */
  function applyMutation(fn: (s: RecipeFlowState) => { graph?: RecipeGraph; portioning?: Portioning; meta?: RecipeMeta }) {
    saveSnapshot()
    set((s) => {
      const partial = fn(s)
      const newGraph = partial.graph ?? s.graph
      const newPortioning = partial.portioning ?? s.portioning
      const newMeta = partial.meta ?? s.meta

      // Run reconciliation engine
      const result = reconcileGraph(newGraph, newPortioning, newMeta)

      return {
        graph: result.graph,
        portioning: result.portioning,
        warnings: result.warnings,
        flowNodes: syncFlowNodes(result.graph, newMeta, result.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        flowEdges: result.graph.edges.map(toFlowEdge),
      }
    })
  }

  const onExpandHandler = (id: string) => {
    set((s) => ({ expandedNodeId: s.expandedNodeId === id ? null : id }))
  }

  return {
    meta: { name: '', author: '', type: 'pane', subtype: 'pane_comune' },
    portioning: {
      mode: 'ball',
      tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
      ball: { weight: 250, count: 4 },
      thickness: 0.5,
      targetHyd: 65, doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 3, preImpasto: null, preFermento: null,
    },
    ingredientGroups: ['Impasto'],
    graph: { nodes: [], edges: [], lanes: [] },
    lanes: [],
    flowNodes: [],
    flowEdges: [],
    selectedNodeId: null,
    expandedNodeId: null,
    peekNodeIds: [],
    lastAddedNodeId: null,
    undoSnapshot: null,
    canUndo: false,
    warnings: [],
    selectedEdgeId: null,
    edgeCalloutPos: null,
    temperatureUnit: 'C' as TemperatureUnit,
    ambientTemp: 24,

    onNodesChange: (changes) => {
      set((s) => {
        const updated = applyNodeChanges(changes, s.flowNodes)
        // Sync positions back to graph
        const newNodes = s.graph.nodes.map((n) => {
          const fn = updated.find((u) => u.id === n.id)
          return fn ? { ...n, position: fn.position } : n
        })
        return {
          flowNodes: updated as Node<BaseNodeData>[],
          graph: { ...s.graph, nodes: newNodes },
        }
      })
    },

    onEdgesChange: (changes) => {
      set((s) => ({ flowEdges: applyEdgeChanges(changes, s.flowEdges) }))
    },

    onConnect: (connection) => {
      set((s) => {
        const newEdge: RecipeEdge = {
          id: `e_${connection.source}__${connection.target}`,
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
        }
        const newGraph = { ...s.graph, edges: [...s.graph.edges, newEdge] }
        return {
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
          flowEdges: addEdge(
            { ...connection, type: 'recipe', data: newEdge.data },
            s.flowEdges,
          ),
        }
      })
    },

    loadRecipe: (recipe) => {
      // Init reconcile: convert to v1, reconcile pre-ferments, map back
      const v1 = graphToRecipeV1(recipe.graph, recipe.meta, recipe.portioning, recipe.ingredientGroups)
      const reconciled = reconcilePreFerments(v1)
      // Map reconciled steps back to graph nodes
      const reconciledNodes = recipe.graph.nodes.map((n) => {
        const step = reconciled.steps.find((st) => st.id === n.id)
        if (!step) return n
        return { ...n, data: { ...n.data, ...stepToNodeData(step) } }
      })
      const graph = { ...recipe.graph, nodes: reconciledNodes }

      set({
        meta: recipe.meta,
        portioning: recipe.portioning,
        ingredientGroups: recipe.ingredientGroups,
        graph,
        lanes: graph.lanes,
        flowNodes: syncFlowNodes(graph, recipe.meta, recipe.portioning, onExpandHandler, null, []),
        flowEdges: graph.edges.map(toFlowEdge),
        selectedNodeId: null,
        expandedNodeId: null,
      })
    },

    setMeta: (fn) => set((s) => ({ meta: fn(s.meta) })),

    setPortioning: (fn) => {
      set((s) => {
        const newP = fn(s.portioning)
        return {
          portioning: newP,
          flowNodes: syncFlowNodes(s.graph, s.meta, newP, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    selectNode: (id) => set({ selectedNodeId: id }),

    expandNode: (id) => set((s) => {
      const newExpanded = s.expandedNodeId === id ? null : id
      return {
        expandedNodeId: newExpanded,
        peekNodeIds: [],
        lastAddedNodeId: null,
        flowNodes: syncFlowNodes(s.graph, s.meta, s.portioning, onExpandHandler, newExpanded, []),
      }
    }),

    peekNode: (id) => set((s) => {
      if (id === s.expandedNodeId) return s
      if (s.peekNodeIds.includes(id)) return s
      const newPeek = s.peekNodeIds.length >= 2
        ? [s.peekNodeIds[0], id]
        : [...s.peekNodeIds, id]
      return {
        peekNodeIds: newPeek,
        lastAddedNodeId: null,
        flowNodes: syncFlowNodes(s.graph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, newPeek),
      }
    }),

    clearPeek: () => set({ peekNodeIds: [] }),

    closePeek: (id) => set((s) => ({
      peekNodeIds: s.peekNodeIds.filter((p) => p !== id),
    })),

    closeAll: () => set({ expandedNodeId: null, peekNodeIds: [], lastAddedNodeId: null }),

    undoLastAdd: () => {
      const { lastAddedNodeId } = get()
      if (!lastAddedNodeId) return
      get().removeNode(lastAddedNodeId)
      set({ lastAddedNodeId: null })
    },

    undo: () => {
      const { undoSnapshot } = get()
      if (!undoSnapshot) return
      set((s) => ({
        graph: undoSnapshot.graph,
        portioning: undoSnapshot.portioning,
        flowNodes: syncFlowNodes(undoSnapshot.graph, s.meta, undoSnapshot.portioning, onExpandHandler, null, []),
        flowEdges: undoSnapshot.graph.edges.map(toFlowEdge),
        undoSnapshot: null,
        canUndo: false,
        expandedNodeId: null,
        peekNodeIds: [],
        lastAddedNodeId: null,
      }))
    },

    setTemperatureUnit: (u) => set({ temperatureUnit: u }),
    setAmbientTemp: (t) => set({ ambientTemp: t }),

    // Cosmetic update — title, desc, position — NO reconciliation
    updateNodeCosmetic: (id, patch) => {
      set((s) => {
        const newNodes = s.graph.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
        )
        const newGraph = { ...s.graph, nodes: newNodes }
        return {
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    // Ingredient/composition update — WITH reconciliation (NO portioning overwrite)
    updateNodeData: (id, patch) => {
      const finalPatch = patch.baseDur !== undefined
        ? { ...patch, userOverrideDuration: true }
        : patch

      applyMutation((s) => ({
        graph: {
          ...s.graph,
          nodes: s.graph.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...finalPatch } } : n,
          ),
        },
      }))
    },

    // ── Reconciliation: the core update with cascading logic ─────
    // Simplified: apply v1 step mutation then let reconcileGraph handle cascading
    updateNodeWithReconcile: (id, fn) => {
      applyMutation((s) => {
        const recipe = graphToRecipeV1(s.graph, s.meta, s.portioning, s.ingredientGroups)
        const newSteps = recipe.steps.map((st) => (st.id === id ? fn(st) : st))
        const newNodes = s.graph.nodes.map((n) => {
          const step = newSteps.find((st) => st.id === n.id)
          if (!step) return n
          return { ...n, data: { ...n.data, ...stepToNodeData(step) } }
        })
        return { graph: { ...s.graph, nodes: newNodes } }
      })
    },

    // ── Scale all nodes uniformly ────────────────────────────────
    scaleAllNodes: (newTotal) => {
      applyMutation((s) => {
        const totals = computeGraphTotals(s.graph)
        if (totals.totalDough <= 0) return { portioning: s.portioning }
        const factor = newTotal / totals.totalDough
        const newNodes = s.graph.nodes.map((n) => ({
          ...n,
          data: scaleNodeData(n.data, factor),
        }))
        return { graph: { ...s.graph, nodes: newNodes } }
      })
    },

    // ── Set global hydration (scale all liquids + save targetHyd) ──
    setGlobalHydration: (h) => {
      saveSnapshot()
      set((s) => {
        // Always save targetHyd in portioning
        const newPortioning = { ...s.portioning, targetHyd: h }

        const totals = computeGraphTotals(s.graph)
        if (totals.totalFlour <= 0 || totals.totalLiquid <= 0) {
          return { portioning: newPortioning }
        }
        const targetLiquid = (totals.totalFlour * h) / 100
        const factor = targetLiquid / totals.totalLiquid

        const newNodes = s.graph.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            liquids: n.data.liquids.map((l) => ({ ...l, g: rnd(l.g * factor) })),
          },
        }))
        const newGraph = { ...s.graph, nodes: newNodes }

        return {
          portioning: newPortioning,
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, newPortioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    // ── Portioning change with scaling ───────────────────────────
    handlePortioningChangeWithScale: (np) => {
      saveSnapshot()
      set((s) => {
        const newTarget = np.mode === 'tray'
          ? Math.round(np.tray.l * np.tray.w * np.thickness * np.tray.count)
          : np.ball.weight * np.ball.count

        const totals = computeGraphTotals(s.graph)
        if (totals.totalDough <= 0) return { ...s, portioning: np }

        const factor = newTarget / totals.totalDough
        const newNodes = s.graph.nodes.map((n) => ({
          ...n,
          data: scaleNodeData(n.data, factor),
        }))
        const newGraph = { ...s.graph, nodes: newNodes }

        return {
          portioning: np,
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, np, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    // ── Apply type defaults ──────────────────────────────────────
    applyTypeDefaults: (typeKey, subtypeKey) => {
      saveSnapshot()
      const subs = RECIPE_SUBTYPES[typeKey] || []
      const sub = subs.find((s) => s.key === subtypeKey)
      if (!sub) return
      const d = sub.defaults
      const s = get()
      const np = { ...s.portioning, mode: d.mode } as Portioning
      if (d.thickness) np.thickness = d.thickness
      if (d.ballG) np.ball = { ...np.ball, weight: d.ballG }
      if (d.hyd) np.targetHyd = d.hyd
      // Apply dough composition defaults
      const doughDefs = getDoughDefaults(typeKey, subtypeKey)
      np.doughHours = doughDefs.defaultDoughHours
      np.saltPct = doughDefs.saltPctDefault
      np.fatPct = doughDefs.fatPctDefault
      // Calculate yeast from Formula L
      np.yeastPct = calcYeastPct(doughDefs.defaultDoughHours, np.targetHyd || 60)
      get().handlePortioningChangeWithScale(np)
    },

    // ── Edge actions ──────────────────────────────────────────────
    selectEdge: (id, pos) => set({ selectedEdgeId: id, edgeCalloutPos: pos ?? null }),

    updateEdgeData: (edgeId, patch) => {
      saveSnapshot()
      set((s) => {
        const newEdges = s.graph.edges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e,
        )
        const newGraph = { ...s.graph, edges: newEdges }
        return {
          graph: newGraph,
          flowEdges: newGraph.edges.map(toFlowEdge),
        }
      })
    },

    removeEdge: (edgeId) => {
      saveSnapshot()
      set((s) => {
        const newEdges = s.graph.edges.filter((e) => e.id !== edgeId)
        const newGraph = { ...s.graph, edges: newEdges }
        return {
          graph: newGraph,
          flowEdges: newGraph.edges.map(toFlowEdge),
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
          selectedEdgeId: s.selectedEdgeId === edgeId ? null : s.selectedEdgeId,
          edgeCalloutPos: null,
        }
      })
    },

    addDep: (nodeId, parentId) => {
      saveSnapshot()
      set((s) => {
        if (s.graph.edges.some((e) => e.source === parentId && e.target === nodeId)) return s
        const newEdge: RecipeEdge = {
          id: `e_${parentId}__${nodeId}`,
          source: parentId,
          target: nodeId,
          data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
        }
        const newGraph = { ...s.graph, edges: [...s.graph.edges, newEdge] }
        return {
          graph: newGraph,
          flowEdges: newGraph.edges.map(toFlowEdge),
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    removeDep: (nodeId, parentId) => {
      saveSnapshot()
      set((s) => {
        const newEdges = s.graph.edges.filter(
          (e) => !(e.source === parentId && e.target === nodeId),
        )
        const newGraph = { ...s.graph, edges: newEdges }
        // Also clear sourcePrep if it pointed to removed parent
        const newNodes = newGraph.nodes.map((n) =>
          n.id === nodeId && n.data.sourcePrep === parentId
            ? { ...n, data: { ...n.data, sourcePrep: null } }
            : n,
        )
        return {
          graph: { ...newGraph, nodes: newNodes },
          flowEdges: newGraph.edges.map(toFlowEdge),
          flowNodes: syncFlowNodes({ ...newGraph, nodes: newNodes }, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    updateDep: (nodeId, parentId, field, value) => {
      set((s) => {
        const newEdges = s.graph.edges.map((e) => {
          if (e.source !== parentId || e.target !== nodeId) return e
          return {
            ...e,
            data: {
              ...e.data,
              ...(field === 'wait' ? { scheduleTimeRatio: value } : { scheduleQtyRatio: value }),
            },
          }
        })
        const newGraph = { ...s.graph, edges: newEdges }
        return {
          graph: newGraph,
          flowEdges: newGraph.edges.map(toFlowEdge),
        }
      })
    },

    // ── Reset recipe to empty state with defaults ──────────────
    resetRecipe: () => {
      set((s) => {
        const doughDefs = getDoughDefaults(s.meta.type, s.meta.subtype)
        const subs = RECIPE_SUBTYPES[s.meta.type] || []
        const sub = subs.find((x) => x.key === s.meta.subtype)
        const d = sub?.defaults

        const np: Portioning = {
          mode: d?.mode || 'ball',
          tray: { preset: 'teglia_40x30', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
          ball: { weight: d?.ballG || 250, count: 4 },
          thickness: d?.thickness || 0.5,
          targetHyd: d?.hyd || 65,
          doughHours: doughDefs.defaultDoughHours,
          yeastPct: calcYeastPct(doughDefs.defaultDoughHours, d?.hyd || 65),
          saltPct: doughDefs.saltPctDefault,
          fatPct: doughDefs.fatPctDefault,
          preImpasto: null,
          preFermento: null,
        }

        const emptyGraph: RecipeGraph = { nodes: [], edges: [], lanes: [] }
        return {
          portioning: np,
          graph: emptyGraph,
          flowNodes: [],
          flowEdges: [],
          expandedNodeId: null,
          peekNodeIds: [],
          selectedEdgeId: null,
          lastAddedNodeId: null,
        }
      })
    },

    // ── Generate full dough graph from settings ─────────────────
    generateDough: () => {
      saveSnapshot()
      set((s) => {
        const portioningTarget = s.portioning.mode === 'tray'
          ? Math.round(s.portioning.thickness * s.portioning.tray.l * s.portioning.tray.w * s.portioning.tray.count)
          : s.portioning.ball.weight * s.portioning.ball.count
        const graph = generateDoughGraph({
          meta: s.meta,
          portioning: s.portioning,
          totalDough: portioningTarget,
        })
        return {
          graph,
          flowNodes: syncFlowNodes(graph, s.meta, s.portioning, onExpandHandler, null, []),
          flowEdges: graph.edges.map(toFlowEdge),
          expandedNodeId: null,
          peekNodeIds: [],
        }
      })
    },

    // ── Add root node (no parent — for empty graphs) ────────────
    addRootNode: (type, subtype = null) => {
      saveSnapshot()
      set((s) => {
        const newId = `${type}_${Date.now().toString(36)}`
        const newNode: RecipeNode = {
          id: newId,
          type,
          subtype: subtype ?? null,
          position: { x: 0, y: 0 },
          lane: 'main',
          data: {
            title: '',
            desc: '',
            group: s.ingredientGroups[0] ?? 'Impasto',
            baseDur: type === 'split' ? 5 : 10,
            restDur: 0,
            restTemp: null,
            flours: [],
            liquids: [],
            extras: [],
            yeasts: [],
            salts: [],
            sugars: [],
            fats: [],
          },
        }

        // Auto-add "done" node if not present
        const hasDone = s.graph.nodes.some((n) => n.type === 'done')
        const newNodes = [...s.graph.nodes, newNode]
        const newEdges = [...s.graph.edges]

        if (!hasDone) {
          const doneId = `done_${Date.now().toString(36)}`
          newNodes.push({
            id: doneId,
            type: 'done',
            subtype: null,
            position: { x: 0, y: 150 },
            lane: 'main',
            data: {
              title: 'Buon Appetito!',
              desc: '',
              group: s.ingredientGroups[0] ?? 'Impasto',
              baseDur: 0,
              restDur: 0,
              restTemp: null,
              flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            },
          })
          newEdges.push({
            id: `e_${newId}__${doneId}`,
            source: newId,
            target: doneId,
            data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
          })
        }

        const newGraph = autoLayout({ ...s.graph, nodes: newNodes, edges: newEdges })

        return {
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
          flowEdges: newGraph.edges.map(toFlowEdge),
          lastAddedNodeId: newId,
        }
      })
    },

    addNode: (afterNodeId, type, subtype = null) => {
      saveSnapshot()
      set((s) => {
        const newId = `${type}_${Date.now().toString(36)}`
        const afterNode = s.graph.nodes.find((n) => n.id === afterNodeId)
        // Build default node data — split nodes get splitOutputs
        const defaultData: any = {
          title: '',
          desc: '',
          group: afterNode?.data.group ?? s.ingredientGroups[0] ?? 'Impasto',
          baseDur: type === 'split' ? 5 : 10,
          restDur: 0,
          restTemp: null,
          flours: [],
          liquids: [],
          extras: [],
          yeasts: [],
          salts: [],
          sugars: [],
          fats: [],
        }

        // Split defaults: 2 outputs at 50/50
        if (type === 'split') {
          defaultData.splitMode = 'pct'
          defaultData.splitOutputs = [
            { handle: 'out_0', label: 'Parte 1', value: 50 },
            { handle: 'out_1', label: 'Parte 2', value: 50 },
          ]
        }

        // Join defaults
        if (type === 'join') {
          defaultData.joinMethod = 'generic'
        }

        const newNode: RecipeNode = {
          id: newId,
          type,
          subtype: subtype ?? null,
          position: {
            x: (afterNode?.position.x ?? 0),
            y: (afterNode?.position.y ?? 0) + 120,
          },
          lane: afterNode?.lane ?? 'main',
          data: defaultData,
        }

        // Insert edge from afterNode to newNode
        const newEdge: RecipeEdge = {
          id: `e_${afterNodeId}__${newId}`,
          source: afterNodeId,
          target: newId,
          data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
        }

        // Re-route edges that went from afterNode to its children → go through newNode
        const outEdges = s.graph.edges.filter((e) => e.source === afterNodeId)
        const keptEdges = s.graph.edges.filter((e) => e.source !== afterNodeId)
        const reroutedEdges = outEdges.map((e) => ({
          ...e,
          id: `e_${newId}__${e.target}`,
          source: newId,
        }))

        const newGraph = autoLayout({
          ...s.graph,
          nodes: [...s.graph.nodes, newNode],
          edges: [...keptEdges, newEdge, ...reroutedEdges],
        })

        return {
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
          flowEdges: newGraph.edges.map(toFlowEdge),
          lastAddedNodeId: newId,
        }
      })
    },

    removeNode: (id) => {
      saveSnapshot()
      set((s) => {
        const newGraph = autoLayout(removeNodeFromGraph(id, s.graph))
        return {
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
          flowEdges: newGraph.edges.map(toFlowEdge),
          expandedNodeId: s.expandedNodeId === id ? null : s.expandedNodeId,
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        }
      })
    },

    runAutoLayout: () => {
      set((s) => {
        const newGraph = autoLayout(s.graph)
        return {
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    toRecipeV2: () => {
      const s = get()
      return {
        version: 2 as const,
        meta: s.meta,
        portioning: s.portioning,
        ingredientGroups: s.ingredientGroups,
        graph: s.graph,
      }
    },
  }
})
