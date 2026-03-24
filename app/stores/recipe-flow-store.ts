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
import { RECIPE_SUBTYPES } from '@/local_data'
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
  lastAddedNodeId: string | null     // for undo
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
  setTemperatureUnit: (u: TemperatureUnit) => void
  setAmbientTemp: (t: number) => void
  updateNodeData: (id: string, patch: Partial<NodeData>) => void
  updateNodeWithReconcile: (id: string, fn: (step: RecipeStep) => RecipeStep) => void

  // Edge actions
  updateEdgeData: (edgeId: string, patch: { scheduleTimeRatio?: number; scheduleQtyRatio?: number }) => void
  removeEdge: (edgeId: string) => void
  addDep: (nodeId: string, parentId: string) => void
  removeDep: (nodeId: string, parentId: string) => void
  updateDep: (nodeId: string, parentId: string, field: 'wait' | 'grams', value: number) => void  // v1 compat: 'wait'→scheduleTimeRatio, 'grams'→scheduleQtyRatio
  selectedEdgeId: string | null
  edgeCalloutPos: { x: number; y: number } | null
  selectEdge: (id: string | null, pos?: { x: number; y: number }) => void
  scaleAllNodes: (newTotal: number) => void
  setGlobalHydration: (h: number) => void
  handlePortioningChangeWithScale: (np: Portioning) => void
  applyTypeDefaults: (typeKey: string, subtypeKey: string) => void
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
      targetHyd: 65,
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

    setTemperatureUnit: (u) => set({ temperatureUnit: u }),
    setAmbientTemp: (t) => set({ ambientTemp: t }),

    updateNodeData: (id, patch) => {
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

    // ── Reconciliation: the core update with cascading logic ─────
    updateNodeWithReconcile: (id, fn) => {
      set((s) => {
        // Convert graph to v1 steps
        const recipe = graphToRecipeV1(s.graph, s.meta, s.portioning, s.ingredientGroups)
        const oldStep = recipe.steps.find((st) => st.id === id)
        if (!oldStep) return s

        // Apply mutation
        let newSteps = recipe.steps.map((st) => (st.id === id ? fn(st) : st))
        const newStep = newSteps.find((st) => st.id === id)
        if (!newStep) return s

        // Calculate target for pre-ferment reconciliation
        const target = s.portioning.mode === 'tray'
          ? Math.round(s.portioning.tray.l * s.portioning.tray.w * s.portioning.thickness * s.portioning.tray.count)
          : s.portioning.ball.weight * s.portioning.ball.count

        // Pre-ferment auto-reconcile
        if (newStep.type === 'pre_ferment' && newStep.preFermentCfg) {
          newSteps = newSteps.map((st) =>
            st.id === id ? recalcPreFermentIngredients(st, target) : st,
          )
          newSteps = adjustDoughForPreFerment(newSteps, id, target, s.portioning.targetHyd)
        } else {
          // Auto-scale propagation to children
          const oldWeight = getStepTotalWeight(oldStep)
          const newWeight = getStepTotalWeight(newStep)
          if (oldWeight > 0 && newWeight > 0 && Math.abs(newWeight - oldWeight) > 0.01) {
            const ratio = newWeight / oldWeight
            const childIds = getChildIds(id, newSteps)
            if (childIds.length > 0) {
              // Simple one-level scale (v1-compatible propagateScale)
              for (const childId of childIds) {
                const ci = newSteps.findIndex((st) => st.id === childId)
                if (ci === -1) continue
                const child = newSteps[ci]
                const dep = child.deps.find((d) => d.id === id)
                if (!dep || dep.grams <= 0) continue
                newSteps[ci] = {
                  ...child,
                  flours: child.flours.map((f) => ({ ...f, g: rnd(f.g * ratio) })),
                  liquids: child.liquids.map((l) => ({ ...l, g: rnd(l.g * ratio) })),
                  extras: child.extras.map((e) => (e.unit ? e : { ...e, g: rnd(e.g * ratio) })),
                  yeasts: (child.yeasts || []).map((y) => ({ ...y, g: rnd(y.g * ratio) })),
                  salts: (child.salts || []).map((x) => ({ ...x, g: rnd(x.g * ratio) })),
                  sugars: (child.sugars || []).map((x) => ({ ...x, g: rnd(x.g * ratio) })),
                  fats: (child.fats || []).map((x) => ({ ...x, g: rnd(x.g * ratio) })),
                }
              }
            }
          }
        }

        // Map modified steps back to graph nodes
        const newGraphNodes = s.graph.nodes.map((n) => {
          const step = newSteps.find((st) => st.id === n.id)
          if (!step) return n
          return { ...n, data: { ...n.data, ...stepToNodeData(step) } }
        })
        const newGraph = { ...s.graph, nodes: newGraphNodes }

        return {
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    // ── Scale all nodes uniformly ────────────────────────────────
    scaleAllNodes: (newTotal) => {
      set((s) => {
        const totals = computeGraphTotals(s.graph)
        if (totals.totalDough <= 0) return s
        const factor = newTotal / totals.totalDough

        const newNodes = s.graph.nodes.map((n) => ({
          ...n,
          data: scaleNodeData(n.data, factor),
        }))
        const newGraph = { ...s.graph, nodes: newNodes }

        return {
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    // ── Set global hydration (scale all liquids) ─────────────────
    setGlobalHydration: (h) => {
      set((s) => {
        const totals = computeGraphTotals(s.graph)
        if (totals.totalFlour <= 0 || totals.totalLiquid <= 0) return s
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
          graph: newGraph,
          flowNodes: syncFlowNodes(newGraph, s.meta, s.portioning, onExpandHandler, s.expandedNodeId, s.peekNodeIds),
        }
      })
    },

    // ── Portioning change with scaling ───────────────────────────
    handlePortioningChangeWithScale: (np) => {
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
      const subs = RECIPE_SUBTYPES[typeKey] || []
      const sub = subs.find((s) => s.key === subtypeKey)
      if (!sub) return
      const d = sub.defaults
      const s = get()
      const np = { ...s.portioning, mode: d.mode } as Portioning
      if (d.thickness) np.thickness = d.thickness
      if (d.ballG) np.ball = { ...np.ball, weight: d.ballG }
      get().handlePortioningChangeWithScale(np)
      if (d.hyd) {
        setTimeout(() => get().setGlobalHydration(d.hyd), 50)
      }
    },

    // ── Edge actions ──────────────────────────────────────────────
    selectEdge: (id, pos) => set({ selectedEdgeId: id, edgeCalloutPos: pos ?? null }),

    updateEdgeData: (edgeId, patch) => {
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

    addNode: (afterNodeId, type, subtype = null) => {
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
