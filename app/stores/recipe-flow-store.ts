import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
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
  NodeTypeKey,
  NodeData,
} from '@commons/types/recipe-graph'
import type { RecipeMeta, Portioning, TemperatureUnit, RecipeStep, PortioningLocks } from '@commons/types/recipe'
import { DEFAULT_LOCKS } from '@commons/types/recipe'
import type { RecipeV3, RecipeLayer, CrossLayerEdge, LayerType } from '@commons/types/recipe-layers'
import { getDefaultMasterConfig, LAYER_TYPE_META } from '@commons/constants/layer-defaults'
import { ensureRecipeV3 } from '@commons/utils/recipe-migration'
import { autoLayout } from '~/lib/auto-layout'
import { removeNodeFromGraph, getNodeTotalWeight } from '@commons/utils/graph-utils'
import { rnd } from '@commons/utils/format'
import { graphToRecipeV1, stepToNodeData } from '@commons/utils/graph-adapter'
import { computeGraphTotals, scaleNodeData } from '~/hooks/useGraphCalculator'
import { generateDoughGraph } from '~/lib/generate-dough'
import { resolveTemplate } from '@commons/constants/layer-templates'
import { generateLayerGraph } from '~/lib/generate-layer-graph'
import { useLocaleStore, getMessages } from '~/hooks/useTranslation'
import { RECIPE_SUBTYPES } from '@/local_data'
import type { ActionableWarning as RecipeWarning } from '@commons/types/recipe-graph'
import type { AutoCorrectReport } from '@commons/types/auto-correct'
import { applyWarningActionPure } from '@commons/utils/graph-mutation-engine'
import {
  reconcileGraphRPC,
  autoCorrectRPC,
  calcYeastPctRPC,
  getDoughDefaultsRPC,
  estimateBlendWRPC,
  computePanoramicaRPC,
} from '~/lib/recipe-rpc'
import type { BaseNodeData } from '~/components/recipe-flow/nodes/BaseNode'
import { getNodeDuration } from '~/hooks/useGraphCalculator'

// ── Default portioning (fallback for non-impasto layers) ────────

const DEFAULT_PORTIONING: Portioning = {
  mode: 'ball',
  tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
  ball: { weight: 250, count: 4 },
  thickness: 0.5,
  targetHyd: 65, doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 3,
  preImpasto: null, preFermento: null, flourMix: [],
  autoCorrect: false, reasoningLevel: 'medium',
}

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
  ingredientGroups: string[]

  // Multi-layer (SOURCE OF TRUTH)
  layers: RecipeLayer[]
  activeLayerId: string
  crossEdges: CrossLayerEdge[]
  viewMode: 'layer' | 'panoramica'
  inactiveLayerOpacity: number

  // React Flow nodes/edges (derived from active layer)
  flowNodes: Node<BaseNodeData>[]
  flowEdges: Edge[]

  // Onboarding (empty recipe flow)
  showOnboarding: boolean

  // UI state
  selectedNodeId: string | null
  expandedNodeId: string | null
  peekNodeIds: string[]              // max 2 — CTRL+click panels
  lastAddedNodeId: string | null     // for undo toast
  undoSnapshot: { layers: RecipeLayer[]; crossEdges: CrossLayerEdge[]; meta: RecipeMeta } | null
  temperatureUnit: TemperatureUnit
  ambientTemp: number

  // React Flow callbacks
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect

  // Actions
  loadRecipe: (recipe: RecipeV2 | RecipeV3) => void
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
  batchUpdateNodes: (updates: Array<{ id: string; patch: Partial<NodeData> }>) => void  // atomic multi-node update — single reconciliation
  updateNodeWithReconcile: (id: string, fn: (step: RecipeStep) => RecipeStep) => void

  // Edge actions
  updateEdgeData: (edgeId: string, patch: { scheduleTimeRatio?: number; scheduleQtyRatio?: number; style?: import('@commons/types/recipe-graph').EdgeStyle }) => void
  updateEdgeCurvature: (edgeId: string, curvature: number) => void
  removeEdge: (edgeId: string) => void
  addDep: (nodeId: string, parentId: string) => void
  removeDep: (nodeId: string, parentId: string) => void
  updateDep: (nodeId: string, parentId: string, field: 'wait' | 'grams', value: number) => void  // v1 compat: 'wait'→scheduleTimeRatio, 'grams'→scheduleQtyRatio
  warnings: RecipeWarning[]
  autoCorrectReport: AutoCorrectReport | null
  llmInsights: any[]
  autoResolveEnabled: boolean
  selectedEdgeId: string | null
  edgeCalloutPos: { x: number; y: number } | null
  selectEdge: (id: string | null, pos?: { x: number; y: number }) => void
  scaleAllNodes: (newTotal: number) => void
  setGlobalHydration: (h: number) => void
  handlePortioningChangeWithScale: (np: Portioning) => void
  toggleLock: (field: keyof import('@commons/types/recipe').PortioningLocks) => void
  updateDoughHours: (hours: number) => void
  applyWarningAction: (warning: import('@commons/types/recipe-graph').ActionableWarning, actionIdx: number) => void
  applyAllWarningActions: () => void
  applyTypeDefaults: (typeKey: string, subtypeKey: string) => void
  resetRecipe: () => void
  generateDough: () => void
  addRootNode: (type: NodeTypeKey, subtype?: string | null) => void
  addNode: (afterNodeId: string, type: NodeTypeKey, subtype?: string | null) => void
  removeNode: (id: string) => void
  runAutoLayout: () => void

  // Onboarding
  dismissOnboarding: () => void

  // Layer CRUD
  setActiveLayer: (layerId: string) => void
  addLayer: (type: LayerType, subtype: string, variant: string, name?: string) => void
  updateLayerSubtype: (layerId: string, subtype: string, variant: string) => void
  updateLayerVariant: (layerId: string, variant: string) => void
  removeLayer: (layerId: string) => void
  duplicateLayer: (layerId: string) => void
  updateLayer: (layerId: string, patch: Partial<Pick<RecipeLayer, 'name' | 'color' | 'icon' | 'visible' | 'locked' | 'position'>>) => void
  reorderLayers: (orderedIds: string[]) => void
  addCrossEdge: (source: { layerId: string; nodeId: string }, target: { layerId: string; nodeId: string }) => void
  removeCrossEdge: (edgeId: string) => void
  setViewMode: (mode: 'layer' | 'panoramica') => void
  setInactiveLayerOpacity: (opacity: number) => void
  toggleAutoResolve: () => void
  toRecipeV3: () => RecipeV3
}

// ── Helper: sync flow nodes from graph ──────────────────────────

// Node types that REQUIRE at least one incoming edge to be valid
const REQUIRES_INPUT = new Set([
  'rise', 'shape', 'pre_bake', 'bake', 'post_bake', 'done', 'rest', 'join',
])

/** Pre-compute set of node IDs with error/warning-level warnings (for red highlighting) */
function buildCriticalWarningNodeIds(warnings: RecipeWarning[]): Set<string> {
  const ids = new Set<string>()
  for (const w of warnings) {
    if (w.sourceNodeId && (w.severity === 'error' || w.severity === 'warning')) {
      ids.add(w.sourceNodeId)
    }
  }
  return ids
}

function syncFlowNodes(
  graph: RecipeGraph,
  meta: RecipeMeta,
  portioning: Portioning,
  onExpand: (id: string) => void,
  expandedNodeId?: string | null,
  peekNodeIds?: string[],
  criticalWarningNodeIds?: Set<string>,
): Node<BaseNodeData>[] {
  const nodesWithIncoming = new Set(graph.edges.map((e) => e.target))
  const nodesWithCriticalWarnings = criticalWarningNodeIds ?? new Set<string>()

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
    fn.data.isError = (REQUIRES_INPUT.has(n.type) && !nodesWithIncoming.has(n.id)) || nodesWithCriticalWarnings.has(n.id)
    fn.data.inFlow = nodeInFlow.get(n.id) || []
    fn.data.outFlow = nodeOutFlow.get(n.id) || []
    return fn
  })
}

// ── Create store ────────────────────────────────────────────────

export const useRecipeFlowStore = create<RecipeFlowState>((set, get) => {
  // ── Internal helpers (layers-first data access) ─────────────

  /** Get the active layer from state */
  function getActiveLayer(s: RecipeFlowState): RecipeLayer {
    return s.layers.find(l => l.id === s.activeLayerId) ?? s.layers[0]
  }

  /** Get graph from active layer */
  function getGraph(s: RecipeFlowState): RecipeGraph {
    const layer = getActiveLayer(s)
    if (!layer) return { nodes: [], edges: [], lanes: [] }
    return { nodes: layer.nodes, edges: layer.edges, lanes: layer.lanes, viewport: layer.viewport }
  }

  /** Get portioning from active layer (impasto only, fallback for non-impasto) */
  function getPortioning(s: RecipeFlowState): Portioning {
    const layer = getActiveLayer(s)
    if (!layer) return DEFAULT_PORTIONING
    if (layer.masterConfig.type === 'impasto') return layer.masterConfig.config
    return DEFAULT_PORTIONING
  }

  /** Return new layers[] with the active layer replaced by a patched version */
  function withActiveLayerUpdate(s: RecipeFlowState, patch: Partial<RecipeLayer>): RecipeLayer[] {
    return s.layers.map(l => l.id === s.activeLayerId ? { ...l, ...patch } : l)
  }

  /** Return new layers[] with the active layer's graph updated */
  function withGraphUpdate(s: RecipeFlowState, graph: RecipeGraph): RecipeLayer[] {
    return s.layers.map(l => {
      if (l.id !== s.activeLayerId) return l
      return { ...l, nodes: graph.nodes, edges: graph.edges, lanes: graph.lanes }
    })
  }

  /** Return new layers[] with the active layer's portioning updated (impasto only) */
  function withPortioningUpdate(s: RecipeFlowState, portioning: Portioning): RecipeLayer[] {
    return s.layers.map(l => {
      if (l.id !== s.activeLayerId) return l
      if (l.masterConfig.type !== 'impasto') return l
      return { ...l, masterConfig: { type: 'impasto', config: portioning } }
    })
  }

  /** Return new layers[] with both graph and portioning updated for active layer */
  /** Update the active layer with un-reconciled graph (for optimistic updates) */
  function withGraphAndPortioningUpdate(
    s: RecipeFlowState,
    graph: RecipeGraph,
    portioning: Portioning,
  ): RecipeLayer[] {
    return s.layers.map(l => {
      if (l.id !== s.activeLayerId) return l
      const updated: RecipeLayer = { ...l, nodes: graph.nodes, edges: graph.edges, lanes: graph.lanes }
      if (l.masterConfig.type === 'impasto') {
        updated.masterConfig = { type: 'impasto', config: portioning }
      }
      return updated
    })
  }

  function withReconcileResult(
    s: RecipeFlowState,
    result: { graph: RecipeGraph; portioning: Portioning },
  ): RecipeLayer[] {
    return s.layers.map(l => {
      if (l.id !== s.activeLayerId) return l
      const updated: RecipeLayer = { ...l, nodes: result.graph.nodes, edges: result.graph.edges, lanes: result.graph.lanes }
      if (l.masterConfig.type === 'impasto') {
        updated.masterConfig = { type: 'impasto', config: result.portioning }
      }
      return updated
    })
  }

  /** Build flowNodes/flowEdges for ALL visible layers (active at 1.0, inactive dimmed) */
  function rebuildAllFlowNodes(s: RecipeFlowState): { flowNodes: Node<BaseNodeData>[]; flowEdges: Edge[] } {
    const activeLayer = getActiveLayer(s)
    if (!activeLayer) return { flowNodes: [], flowEdges: [] }

    const graph = getGraph(s)
    const portioning = getPortioning(s)

    // Active layer: full interactivity
    const activeFlowNodes = syncFlowNodes(
      graph, s.meta, portioning, onExpandHandler,
      s.expandedNodeId, s.peekNodeIds,
      buildCriticalWarningNodeIds(s.warnings ?? [])
    )
    const activeFlowEdges = graph.edges.map(toFlowEdge)

    // Apply the same positional offset to the active layer so switching layers doesn't shift layout
    const activeLayerOffset = activeLayer.position * 400
    for (const fn of activeFlowNodes) {
      fn.position = { x: fn.position.x + activeLayerOffset, y: fn.position.y }
      // If active layer is locked, disable drag and connect
      if (activeLayer.locked) {
        fn.draggable = false
        fn.connectable = false
        fn.data = { ...fn.data, layerLocked: true }
      }
    }

    // Inactive visible layers: dimmed, non-interactive, namespaced IDs
    const dimmedNodes: Node<BaseNodeData>[] = []
    const dimmedEdges: Edge[] = []

    for (const layer of s.layers) {
      if (layer.id === s.activeLayerId || !layer.visible) continue
      for (const node of layer.nodes) {
        const dur = getNodeDuration(node, s.meta.type, s.meta.subtype, portioning.thickness)
        const fn = toFlowNode(node, dur, () => {})
        fn.id = `${layer.id}:${node.id}`
        fn.position = { x: node.position.x + layer.position * 400, y: node.position.y }
        fn.draggable = false
        fn.connectable = false
        fn.selectable = false
        fn.style = { ...fn.style, opacity: s.inactiveLayerOpacity }
        fn.data = { ...fn.data, layerColor: layer.color, layerLocked: layer.locked, isPeek: s.peekNodeIds.includes(fn.id) }
        dimmedNodes.push(fn)
      }
      for (const edge of layer.edges) {
        const fe = toFlowEdge(edge)
        fe.id = `${layer.id}:${edge.id}`
        fe.source = `${layer.id}:${edge.source}`
        fe.target = `${layer.id}:${edge.target}`
        fe.style = { ...fe.style, opacity: s.inactiveLayerOpacity * 0.7 }
        fe.selectable = false
        dimmedEdges.push(fe)
      }
    }

    // Cross-layer edges (dashed purple)
    const crossFlowEdges: Edge[] = []
    for (const ce of s.crossEdges) {
      // Resolve source/target IDs: if the node belongs to the active layer, use bare ID; else use namespaced
      const sourceFlowId = ce.sourceLayerId === s.activeLayerId
        ? ce.sourceNodeId
        : `${ce.sourceLayerId}:${ce.sourceNodeId}`
      const targetFlowId = ce.targetLayerId === s.activeLayerId
        ? ce.targetNodeId
        : `${ce.targetLayerId}:${ce.targetNodeId}`

      crossFlowEdges.push({
        id: ce.id,
        source: sourceFlowId,
        target: targetFlowId,
        type: 'recipe',
        data: ce.data,
        style: { strokeDasharray: '8,6', stroke: '#8b5cf6', strokeWidth: 2 },
      })
    }

    return {
      flowNodes: [...dimmedNodes, ...activeFlowNodes],
      flowEdges: [...dimmedEdges, ...activeFlowEdges, ...crossFlowEdges],
    }
  }

  // ── Snapshot / Mutation engine ──────────────────────────────

  /** Save current state as undo snapshot before any mutation */
  function saveSnapshot() {
    const s = get()
    set({
      undoSnapshot: {
        layers: JSON.parse(JSON.stringify(s.layers)),
        crossEdges: JSON.parse(JSON.stringify(s.crossEdges)),
        meta: JSON.parse(JSON.stringify(s.meta)),
      },
      canUndo: true,
    })
  }

  /**
   * Apply a mutation to the graph, then run reconciliation via oRPC (server-side).
   * This is THE central mutation point — all graph changes should go through here.
   *
   * Pattern: optimistic local update → async server reconciliation → apply result.
   */
  function applyMutation(fn: (view: { graph: RecipeGraph; portioning: Portioning; meta: RecipeMeta; ingredientGroups: string[] }) => { graph?: RecipeGraph; portioning?: Portioning; meta?: RecipeMeta }) {
    saveSnapshot()

    // Step 1: Apply mutation optimistically (local, immediate)
    const s = get()
    const graph = getGraph(s)
    const portioning = getPortioning(s)
    const view = { graph, portioning, meta: s.meta, ingredientGroups: s.ingredientGroups }
    const partial = fn(view)
    const newGraph = partial.graph ?? graph
    const newPortioning = partial.portioning ?? portioning
    const newMeta = partial.meta ?? s.meta

    // Optimistic: update layers with un-reconciled graph
    set((current) => {
      const optimisticLayers = withGraphAndPortioningUpdate(current, newGraph, newPortioning)
      return {
        layers: optimisticLayers,
        isReconciling: true,
        reconcileError: null,
        ...rebuildAllFlowNodes({ ...current, layers: optimisticLayers, meta: newMeta }),
      }
    })

    // Step 2: Reconcile via server (debounced 300ms)
    const locale = s.meta.locale || 'it'
    reconcileGraphRPC(newGraph, newPortioning, newMeta, locale, {
      debounceMs: 300,
      llmVerify: true,
      autoResolve: get().autoResolveEnabled,
    })
      .then((result) => {
        const current = get()
        const updatedGroups = [...current.ingredientGroups]
        for (const node of result.graph.nodes) {
          if (node.data.group?.startsWith('Cottura') && !updatedGroups.includes(node.data.group)) {
            updatedGroups.push(node.data.group)
          }
        }
        const newLayers = withReconcileResult(current, result)
        set({
          layers: newLayers,
          warnings: result.warnings,
          llmInsights: (result as any).llmInsights ?? [],
          ingredientGroups: updatedGroups,
          isReconciling: false,
          ...rebuildAllFlowNodes({
            ...current, layers: newLayers, warnings: result.warnings,
            meta: newMeta, ingredientGroups: updatedGroups,
          }),
        })
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        set({ isReconciling: false, reconcileError: (err as Error).message })
      })
  }

  const onExpandHandler = (id: string) => {
    set((s) => ({ expandedNodeId: s.expandedNodeId === id ? null : id }))
  }

  return {
    meta: { name: '', author: '', type: 'pane', subtype: 'pane_comune', locale: 'it' },
    ingredientGroups: ['Impasto'],
    layers: [],
    activeLayerId: '',
    crossEdges: [],
    viewMode: 'layer' as const,
    inactiveLayerOpacity: 0.5,
    showOnboarding: false,
    flowNodes: [],
    flowEdges: [],
    selectedNodeId: null,
    expandedNodeId: null,
    peekNodeIds: [],
    lastAddedNodeId: null,
    undoSnapshot: null,
    canUndo: false,
    warnings: [],
    autoCorrectReport: null,
    llmInsights: [] as any[],
    autoResolveEnabled: false,
    isReconciling: false,
    reconcileError: null as string | null,
    selectedEdgeId: null,
    edgeCalloutPos: null,
    temperatureUnit: 'C' as TemperatureUnit,
    ambientTemp: 24,

    onNodesChange: (changes) => {
      set((s) => {
        const updated = applyNodeChanges(changes, s.flowNodes)
        const layer = getActiveLayer(s)
        if (!layer) return { flowNodes: updated as Node<BaseNodeData>[] }
        // Only sync positions for active layer nodes (no : in ID)
        // Subtract the active layer offset so stored positions remain canonical
        const offset = layer.position * 400
        const newNodes = layer.nodes.map((n) => {
          const fn = updated.find((u) => u.id === n.id) // bare ID, no namespace
          return fn ? { ...n, position: { x: fn.position.x - offset, y: fn.position.y } } : n
        })
        return {
          flowNodes: updated as Node<BaseNodeData>[],
          layers: withActiveLayerUpdate(s, { nodes: newNodes }),
        }
      })
    },

    onEdgesChange: (changes) => {
      set((s) => ({ flowEdges: applyEdgeChanges(changes, s.flowEdges) }))
    },

    onConnect: (connection) => {
      set((s) => {
        const sourceId = connection.source!
        const targetId = connection.target!
        const sourceIsNamespaced = sourceId.includes(':')
        const targetIsNamespaced = targetId.includes(':')

        // Reject connections involving locked layers
        const activeLayer = getActiveLayer(s)
        if (activeLayer?.locked) return s

        // If either end is namespaced, this is a cross-layer connection
        if (sourceIsNamespaced || targetIsNamespaced) {
          const sourceLayerId = sourceIsNamespaced ? sourceId.split(':')[0] : s.activeLayerId
          const sourceNodeId = sourceIsNamespaced ? sourceId.split(':').slice(1).join(':') : sourceId
          const targetLayerId = targetIsNamespaced ? targetId.split(':')[0] : s.activeLayerId
          const targetNodeId = targetIsNamespaced ? targetId.split(':').slice(1).join(':') : targetId

          // Reject if source or target layer is locked
          const srcLayer = s.layers.find(l => l.id === sourceLayerId)
          const tgtLayer = s.layers.find(l => l.id === targetLayerId)
          if (srcLayer?.locked || tgtLayer?.locked) return s

          // Don't create intra-layer edges via this path
          if (sourceLayerId === targetLayerId) return s

          const ceId = `xedge_${sourceLayerId}_${sourceNodeId}__${targetLayerId}_${targetNodeId}`
          if (s.crossEdges.some(e => e.id === ceId)) return s

          const newCrossEdge = {
            id: ceId,
            sourceLayerId,
            sourceNodeId,
            targetLayerId,
            targetNodeId,
            data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
          }
          const newCrossEdges = [...s.crossEdges, newCrossEdge]
          return {
            crossEdges: newCrossEdges,
            ...rebuildAllFlowNodes({ ...s, crossEdges: newCrossEdges }),
          }
        }

        // Intra-layer edge (existing logic)
        const graph = getGraph(s)
        const newEdge: RecipeEdge = {
          id: `e_${sourceId}__${targetId}`,
          source: sourceId,
          target: targetId,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
        }
        const newGraph = { ...graph, edges: [...graph.edges, newEdge] }
        const newLayers = withGraphUpdate(s, newGraph)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
        }
      })
    },

    loadRecipe: (recipe) => {
      const v3 = ensureRecipeV3(recipe as RecipeV2 | RecipeV3)
      const activeLayer = v3.layers[0]

      // Empty recipe: show onboarding picker
      if (!activeLayer) {
        set({
          ...get(),
          meta: v3.meta,
          ingredientGroups: v3.ingredientGroups,
          layers: [],
          activeLayerId: '',
          crossEdges: v3.crossEdges ?? [],
          viewMode: 'layer',
          showOnboarding: true,
          warnings: [],
          selectedNodeId: null,
          expandedNodeId: null,
          peekNodeIds: [],
          flowNodes: [],
          flowEdges: [],
        })
        return
      }

      const graph: RecipeGraph = { nodes: activeLayer.nodes, edges: activeLayer.edges, lanes: activeLayer.lanes }
      const portioning = activeLayer.masterConfig.type === 'impasto'
        ? activeLayer.masterConfig.config
        : DEFAULT_PORTIONING

      // Set initial state with un-reconciled graph, then reconcile via server
      // (Pre-ferment reconciliation is handled by server-side reconcileGraph Phase 1)
      const initialState: RecipeFlowState = {
        ...get(),
        meta: v3.meta,
        ingredientGroups: v3.ingredientGroups,
        layers: v3.layers,
        activeLayerId: activeLayer.id,
        crossEdges: v3.crossEdges,
        viewMode: 'layer',
        showOnboarding: false,
        warnings: [],
        isReconciling: true,
        selectedNodeId: null,
        expandedNodeId: null,
        peekNodeIds: [],
        flowNodes: [],
        flowEdges: [],
      }
      set({ ...initialState, ...rebuildAllFlowNodes(initialState) })

      // Server reconciliation (no debounce for initial load, LLM verify on, no auto-resolve)
      const locale = v3.meta.locale || 'it'
      reconcileGraphRPC(graph, portioning, v3.meta, locale, { debounceMs: 0, llmVerify: true, autoResolve: false })
        .then((result) => {
          const updatedLayers = get().layers.map((l, i) => {
            if (i !== 0) return l
            const updated: RecipeLayer = { ...l, nodes: result.graph.nodes, edges: result.graph.edges, lanes: result.graph.lanes }
            if (l.masterConfig.type === 'impasto') {
              updated.masterConfig = { type: 'impasto' as const, config: result.portioning }
            }
            return updated
          })
          const loadState: RecipeFlowState = {
            ...get(),
            layers: updatedLayers,
            warnings: result.warnings,
            llmInsights: (result as any).llmInsights ?? [],
            isReconciling: false,
          }
          set({ ...loadState, ...rebuildAllFlowNodes(loadState) })
        })
        .catch((err) => {
          set({ isReconciling: false, reconcileError: (err as Error).message })
        })
    },

    setMeta: (fn) => set((s) => ({ meta: fn(s.meta) })),

    setPortioning: (fn) => {
      set((s) => {
        const portioning = getPortioning(s)
        const newP = fn(portioning)
        const newLayers = withPortioningUpdate(s, newP)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
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
        ...rebuildAllFlowNodes({ ...s, expandedNodeId: newExpanded, peekNodeIds: [] }),
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
        ...rebuildAllFlowNodes({ ...s, peekNodeIds: newPeek }),
      }
    }),

    clearPeek: () => set({ peekNodeIds: [] }),

    closePeek: (id) => set((s) => ({
      peekNodeIds: s.peekNodeIds.filter((p) => p !== id),
    })),

    closeAll: () => set((s) => ({
      expandedNodeId: null,
      peekNodeIds: [],
      lastAddedNodeId: null,
      ...rebuildAllFlowNodes({ ...s, expandedNodeId: null, peekNodeIds: [] }),
    })),

    undoLastAdd: () => {
      const { lastAddedNodeId } = get()
      if (!lastAddedNodeId) return
      get().removeNode(lastAddedNodeId)
      set({ lastAddedNodeId: null })
    },

    undo: () => {
      const { undoSnapshot } = get()
      if (!undoSnapshot) return
      set((s) => {
        const layer = undoSnapshot.layers.find(l => l.id === s.activeLayerId) ?? undoSnapshot.layers[0]
        if (!layer) return { undoSnapshot: null, canUndo: false }
        const undoState: RecipeFlowState = {
          ...s,
          layers: undoSnapshot.layers,
          crossEdges: undoSnapshot.crossEdges,
          meta: undoSnapshot.meta,
          expandedNodeId: null,
          peekNodeIds: [],
        }
        return {
          layers: undoSnapshot.layers,
          crossEdges: undoSnapshot.crossEdges,
          meta: undoSnapshot.meta,
          ...rebuildAllFlowNodes(undoState),
          undoSnapshot: null,
          canUndo: false,
          expandedNodeId: null,
          peekNodeIds: [],
          lastAddedNodeId: null,
        }
      })
    },

    setTemperatureUnit: (u) => set({ temperatureUnit: u }),
    setAmbientTemp: (t) => set({ ambientTemp: t }),

    // Cosmetic update — title, desc, position — NO reconciliation
    updateNodeCosmetic: (id, patch) => {
      set((s) => {
        const layer = getActiveLayer(s)
        if (!layer) return s
        const newNodes = layer.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
        )
        const newLayers = withActiveLayerUpdate(s, { nodes: newNodes })
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
        }
      })
    },

    // Ingredient/composition update — WITH reconciliation (NO portioning overwrite)
    updateNodeData: (id, patch) => {
      const finalPatch = patch.baseDur !== undefined
        ? { ...patch, userOverrideDuration: true }
        : patch

      applyMutation((view) => ({
        graph: {
          ...view.graph,
          nodes: view.graph.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...finalPatch } } : n,
          ),
        },
      }))
    },

    // Atomic multi-node update — single applyMutation → single reconciliation.
    // Prevents stale-closure bugs when updating multiple nodes in a loop.
    batchUpdateNodes: (updates) => {
      applyMutation((view) => {
        const newNodes = view.graph.nodes.map((n) => {
          const upd = updates.find((u) => u.id === n.id)
          if (!upd) return n
          const finalPatch = upd.patch.baseDur !== undefined
            ? { ...upd.patch, userOverrideDuration: true }
            : upd.patch
          return { ...n, data: { ...n.data, ...finalPatch } }
        })
        return { graph: { ...view.graph, nodes: newNodes } }
      })
    },

    // ── Reconciliation: the core update with cascading logic ─────
    // Simplified: apply v1 step mutation then let reconcileGraph handle cascading
    updateNodeWithReconcile: (id, fn) => {
      applyMutation((view) => {
        const recipe = graphToRecipeV1(view.graph, view.meta, view.portioning, view.ingredientGroups)
        const newSteps = recipe.steps.map((st) => (st.id === id ? fn(st) : st))
        const newNodes = view.graph.nodes.map((n) => {
          const step = newSteps.find((st) => st.id === n.id)
          if (!step) return n
          return { ...n, subtype: step.subtype, data: { ...n.data, ...stepToNodeData(step) } }
        })
        return { graph: { ...view.graph, nodes: newNodes } }
      })
    },

    // ── Scale all nodes uniformly ────────────────────────────────
    scaleAllNodes: (newTotal) => {
      const portioning = getPortioning(get())
      const locks = portioning.locks ?? DEFAULT_LOCKS
      if (locks.totalDough) return // locked — no scaling
      applyMutation((view) => {
        const totals = computeGraphTotals(view.graph)
        if (totals.totalDough <= 0) return { portioning: view.portioning }
        const factor = newTotal / totals.totalDough
        const newNodes = view.graph.nodes.map((n) => ({
          ...n,
          data: scaleNodeData(n.data, factor),
        }))
        return { graph: { ...view.graph, nodes: newNodes } }
      })
    },

    // ── Set global hydration (scale all liquids + save targetHyd) ──
    // Routes through applyMutation so reconcileGraph runs (Phase 3d enforces totalDough lock).
    setGlobalHydration: (h) => {
      const portioning = getPortioning(get())
      const locks = portioning.locks ?? DEFAULT_LOCKS
      if (locks.hydration) return // locked — no hydration change
      applyMutation((view) => {
        const newPortioning = { ...view.portioning, targetHyd: h }
        const totals = computeGraphTotals(view.graph)
        if (totals.totalFlour <= 0 || totals.totalLiquid <= 0) {
          return { portioning: newPortioning }
        }
        const targetLiquid = (totals.totalFlour * h) / 100
        const factor = targetLiquid / totals.totalLiquid
        const newNodes = view.graph.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            liquids: n.data.liquids.map((l) => ({ ...l, g: rnd(l.g * factor) })),
          },
        }))
        return {
          portioning: newPortioning,
          graph: { ...view.graph, nodes: newNodes },
        }
      })
    },

    // ── Portioning change with scaling ───────────────────────────
    handlePortioningChangeWithScale: (np) => {
      saveSnapshot()
      const portioning = getPortioning(get())
      const locks = portioning.locks ?? DEFAULT_LOCKS
      set((s) => {
        const graph = getGraph(s)
        // When totalDough is locked, update portioning without scaling nodes
        if (locks.totalDough) {
          const newLayers = withPortioningUpdate(s, np)
          return {
            layers: newLayers,
            ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
          }
        }

        const newTarget = np.mode === 'tray'
          ? Math.round(np.tray.l * np.tray.w * np.thickness * np.tray.count)
          : np.ball.weight * np.ball.count

        const totals = computeGraphTotals(graph)
        if (totals.totalDough <= 0) {
          return {
            layers: withPortioningUpdate(s, np),
          }
        }

        const factor = newTarget / totals.totalDough
        const newNodes = graph.nodes.map((n) => ({
          ...n,
          data: scaleNodeData(n.data, factor),
        }))
        const newGraph: RecipeGraph = { ...graph, nodes: newNodes }

        // Update both graph (scaled nodes) and portioning
        const newLayers = s.layers.map(l => {
          if (l.id !== s.activeLayerId) return l
          const updated: RecipeLayer = { ...l, nodes: newGraph.nodes, edges: newGraph.edges, lanes: newGraph.lanes }
          if (l.masterConfig.type === 'impasto') {
            updated.masterConfig = { type: 'impasto', config: np }
          }
          return updated
        })
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
        }
      })
    },

    // ── Execute warning action via pure mutation engine ──────────
    applyWarningAction: (warning, actionIdx) => {
      const s = get()
      const graph = getGraph(s)
      const portioning = getPortioning(s)
      const { graph: newGraph, portioning: newPort } = applyWarningActionPure(
        warning, actionIdx, graph, portioning,
      )
      applyMutation(() => ({ graph: newGraph, portioning: newPort }))
    },

    // ── Apply all warnings via iterative auto-correct solver ──────
    applyAllWarningActions: () => {
      const s = get()
      const graph = getGraph(s)
      const portioning = getPortioning(s)
      const locale = s.meta.locale || 'it'
      set({ isReconciling: true })
      autoCorrectRPC(graph, portioning, s.meta, locale, {
        autoCorrect: true,
        reasoningLevel: portioning.reasoningLevel,
      })
        .then((result) => {
          applyMutation(() => ({
            graph: result.graph as RecipeGraph,
            portioning: result.portioning as Portioning,
          }))
          set({ autoCorrectReport: result.report, isReconciling: false })
        })
        .catch((err) => {
          set({ isReconciling: false, reconcileError: (err as Error).message })
        })
    },

    // ── Toggle field lock (mutual exclusivity for duration <-> yeastPct) ──
    toggleLock: (field) => {
      set((s) => {
        const portioning = getPortioning(s)
        const graph = getGraph(s)
        const locks: PortioningLocks = { ...(portioning.locks ?? DEFAULT_LOCKS) }
        locks[field] = !locks[field]
        if (field === 'duration' && locks.duration) locks.yeastPct = false
        if (field === 'yeastPct' && locks.yeastPct) locks.duration = false

        const patch: Partial<Portioning> = { locks }

        // Capture/clear the actual graph total when totalDough lock toggles
        if (field === 'totalDough') {
          if (locks.totalDough) {
            const totals = computeGraphTotals(graph)
            patch.lockedTotalDough = totals.totalDough > 0
              ? totals.totalDough
              : (portioning.mode === 'tray'
                  ? Math.round(portioning.tray.l * portioning.tray.w * portioning.thickness * portioning.tray.count)
                  : portioning.ball.weight * portioning.ball.count)
          } else {
            patch.lockedTotalDough = undefined
          }
        }

        return { layers: withPortioningUpdate(s, { ...portioning, ...patch }) }
      })
    },

    // ── Update doughHours WITH reconciliation ─────────────────────
    // Unlike setPortioning, this triggers applyMutation → reconcileGraph.
    // Critical for Phase 3c (rise node scaling when yeastPct is locked).
    updateDoughHours: (hours) => {
      applyMutation((view) => ({
        portioning: { ...view.portioning, doughHours: hours },
      }))
    },

    applyTypeDefaults: async (typeKey, subtypeKey) => {
      saveSnapshot()
      const subs = RECIPE_SUBTYPES[typeKey] || []
      const sub = subs.find((s) => s.key === subtypeKey)
      if (!sub) return
      const d = sub.defaults
      const s = get()
      const currentP = getPortioning(s)
      const np = { ...currentP, mode: d.mode } as Portioning
      if (d.thickness) np.thickness = d.thickness
      if (d.ballG) np.ball = { ...np.ball, weight: d.ballG }
      if (d.hyd) np.targetHyd = d.hyd
      // Apply dough composition defaults via server
      const doughDefs = await getDoughDefaultsRPC(typeKey, subtypeKey)
      np.doughHours = doughDefs.defaultDoughHours
      np.saltPct = doughDefs.saltPctDefault
      np.fatPct = doughDefs.fatPctDefault
      // Calculate yeast from Formula L via server
      np.yeastPct = await calcYeastPctRPC(doughDefs.defaultDoughHours, np.targetHyd || 60, 24)
      get().handlePortioningChangeWithScale(np)
    },

    // ── Edge actions ──────────────────────────────────────────────
    selectEdge: (id, pos) => set({ selectedEdgeId: id, edgeCalloutPos: pos ?? null }),

    updateEdgeData: (edgeId, patch) => {
      saveSnapshot()
      set((s) => {
        const graph = getGraph(s)
        const newEdges = graph.edges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e,
        )
        const newGraph: RecipeGraph = { ...graph, edges: newEdges }
        const newLayers = withGraphUpdate(s, newGraph)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
        }
      })
    },

    updateEdgeCurvature: (edgeId, curvature) => {
      set((s) => {
        // Try active layer edges first
        const graph = getGraph(s)
        const edgeIdx = graph.edges.findIndex((e) => e.id === edgeId)
        if (edgeIdx !== -1) {
          const newEdges = graph.edges.map((e) =>
            e.id === edgeId ? { ...e, data: { ...e.data, curvature } } : e,
          )
          const newGraph: RecipeGraph = { ...graph, edges: newEdges }
          const newLayers = withGraphUpdate(s, newGraph)
          return {
            layers: newLayers,
            ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
          }
        }
        // Try cross-layer edges
        const crossIdx = s.crossEdges.findIndex((e) => e.id === edgeId)
        if (crossIdx !== -1) {
          const newCrossEdges = s.crossEdges.map((e) =>
            e.id === edgeId ? { ...e, data: { ...e.data, curvature } } : e,
          )
          return {
            crossEdges: newCrossEdges,
            ...rebuildAllFlowNodes({ ...s, crossEdges: newCrossEdges }),
          }
        }
        return s
      })
    },

    removeEdge: (edgeId) => {
      saveSnapshot()
      set((s) => {
        const graph = getGraph(s)
        const newEdges = graph.edges.filter((e) => e.id !== edgeId)
        const newGraph: RecipeGraph = { ...graph, edges: newEdges }
        const newLayers = withGraphUpdate(s, newGraph)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
          selectedEdgeId: s.selectedEdgeId === edgeId ? null : s.selectedEdgeId,
          edgeCalloutPos: null,
        }
      })
    },

    addDep: (nodeId, parentId) => {
      saveSnapshot()
      set((s) => {
        const graph = getGraph(s)
        if (graph.edges.some((e) => e.source === parentId && e.target === nodeId)) return s
        const newEdge: RecipeEdge = {
          id: `e_${parentId}__${nodeId}`,
          source: parentId,
          target: nodeId,
          data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
        }
        const newGraph: RecipeGraph = { ...graph, edges: [...graph.edges, newEdge] }
        const newLayers = withGraphUpdate(s, newGraph)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
        }
      })
    },

    removeDep: (nodeId, parentId) => {
      saveSnapshot()
      set((s) => {
        const graph = getGraph(s)
        const newEdges = graph.edges.filter(
          (e) => !(e.source === parentId && e.target === nodeId),
        )
        const newGraph: RecipeGraph = { ...graph, edges: newEdges }
        // Also clear sourcePrep if it pointed to removed parent
        const newNodes = newGraph.nodes.map((n) =>
          n.id === nodeId && n.data.sourcePrep === parentId
            ? { ...n, data: { ...n.data, sourcePrep: null } }
            : n,
        )
        const finalGraph: RecipeGraph = { ...newGraph, nodes: newNodes }
        const newLayers = withGraphUpdate(s, finalGraph)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
        }
      })
    },

    updateDep: (nodeId, parentId, field, value) => {
      set((s) => {
        const graph = getGraph(s)
        const newEdges = graph.edges.map((e) => {
          if (e.source !== parentId || e.target !== nodeId) return e
          return {
            ...e,
            data: {
              ...e.data,
              ...(field === 'wait' ? { scheduleTimeRatio: value } : { scheduleQtyRatio: value }),
            },
          }
        })
        const newGraph: RecipeGraph = { ...graph, edges: newEdges }
        const newLayers = withGraphUpdate(s, newGraph)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
        }
      })
    },

    // ── Reset recipe to empty state with defaults ──────────────
    resetRecipe: () => {
      set({
        layers: [],
        activeLayerId: '',
        crossEdges: [],
        flowNodes: [],
        flowEdges: [],
        expandedNodeId: null,
        peekNodeIds: [],
        selectedEdgeId: null,
        lastAddedNodeId: null,
        showOnboarding: true,
        warnings: [],
      })
    },

    // ── Generate full dough graph from settings ─────────────────
    generateDough: () => {
      saveSnapshot()
      set((s) => {
        const portioning = getPortioning(s)
        const portioningTarget = portioning.mode === 'tray'
          ? Math.round(portioning.thickness * portioning.tray.l * portioning.tray.w * portioning.tray.count)
          : portioning.ball.weight * portioning.ball.count
        // Build t() from current locale for node title generation
        const locale = useLocaleStore.getState().locale
        const dict = getMessages(locale)
        const enDict = getMessages('en')
        const t = (key: string, vars?: Record<string, unknown>): string => {
          const template = dict[key] ?? enDict[key] ?? key
          if (!vars) return template
          return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
            const v = vars[k]
            return v !== undefined && v !== null ? String(v) : ''
          })
        }
        const graph = generateDoughGraph({
          meta: s.meta,
          portioning,
          totalDough: portioningTarget,
          t,
        })
        const newLayers = withGraphUpdate(s, graph)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers, expandedNodeId: null, peekNodeIds: [] }),
          expandedNodeId: null,
          peekNodeIds: [],
        }
      })
    },

    // ── Add root node (no parent — for empty graphs) ────────────
    addRootNode: (type, subtype = null) => {
      saveSnapshot()
      set((s) => {
        const graph = getGraph(s)
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
        const hasDone = graph.nodes.some((n) => n.type === 'done')
        const newNodes = [...graph.nodes, newNode]
        const newEdges = [...graph.edges]

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

        const newGraph = autoLayout({ ...graph, nodes: newNodes, edges: newEdges })
        const newLayers = withGraphUpdate(s, newGraph)

        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
          lastAddedNodeId: newId,
        }
      })
    },

    addNode: (afterNodeId, type, subtype = null) => {
      saveSnapshot()
      set((s) => {
        const graph = getGraph(s)
        const newId = `${type}_${Date.now().toString(36)}`
        const afterNode = graph.nodes.find((n) => n.id === afterNodeId)
        // Build default node data — split nodes get splitOutputs
        const defaultData: NodeData = {
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
        const outEdges = graph.edges.filter((e) => e.source === afterNodeId)
        const keptEdges = graph.edges.filter((e) => e.source !== afterNodeId)
        const reroutedEdges = outEdges.map((e) => ({
          ...e,
          id: `e_${newId}__${e.target}`,
          source: newId,
        }))

        const newGraph = autoLayout({
          ...graph,
          nodes: [...graph.nodes, newNode],
          edges: [...keptEdges, newEdge, ...reroutedEdges],
        })
        const newLayers = withGraphUpdate(s, newGraph)

        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
          lastAddedNodeId: newId,
        }
      })
    },

    removeNode: (id) => {
      saveSnapshot()
      set((s) => {
        const graph = getGraph(s)
        const newGraph = autoLayout(removeNodeFromGraph(id, graph))
        const newLayers = withGraphUpdate(s, newGraph)
        const newExpanded = s.expandedNodeId === id ? null : s.expandedNodeId
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers, expandedNodeId: newExpanded }),
          expandedNodeId: newExpanded,
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        }
      })
    },

    runAutoLayout: () => {
      set((s) => {
        const graph = getGraph(s)
        const newGraph = autoLayout(graph)
        const newLayers = withGraphUpdate(s, newGraph)
        return {
          layers: newLayers,
          ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
        }
      })
    },

    // ── Onboarding ──────────────────────────────────────────────

    dismissOnboarding: () => {
      set({ showOnboarding: false })
    },

    // ── Layer CRUD ────────────────────────────────────────────────

    setActiveLayer: (layerId) => {
      set((s) => {
        const layer = s.layers.find(l => l.id === layerId)
        if (!layer) return s
        return {
          activeLayerId: layerId,
          ...rebuildAllFlowNodes({ ...s, activeLayerId: layerId, expandedNodeId: null, peekNodeIds: [] }),
          expandedNodeId: null,
          peekNodeIds: [],
          selectedNodeId: null,
          selectedEdgeId: null,
        }
      })
    },

    addLayer: (type, subtype, variant, name) => {
      saveSnapshot()
      set((s) => {
        const layerMeta = LAYER_TYPE_META[type]
        const layerId = `layer_${type}_${Date.now().toString(36)}`
        const masterConfig = getDefaultMasterConfig(type, subtype)
        const newLayer: RecipeLayer = {
          id: layerId,
          type,
          subtype,
          variant,
          name: name ?? layerMeta.labelKey,
          color: layerMeta.defaultColor,
          icon: layerMeta.icon,
          position: s.layers.length,
          visible: true,
          locked: false,
          masterConfig,
          nodes: [],
          edges: [],
          lanes: [],
        }

        // Try to populate from template
        const template = resolveTemplate(type, subtype, variant)
        if (template) {
          // Build t() from current locale
          const locale = useLocaleStore.getState().locale
          const dict = getMessages(locale)
          const enDict = getMessages('en')
          const t = (key: string, vars?: Record<string, unknown>): string => {
            const tpl = dict[key] ?? enDict[key] ?? key
            if (!vars) return tpl
            return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
              const v = vars[k]
              return v !== undefined && v !== null ? String(v) : ''
            })
          }

          // For impasto, update meta to match the layer's subtype/variant
          const recipeMeta = type === 'impasto'
            ? { ...s.meta, type: subtype, subtype: variant }
            : s.meta

          const graph = generateLayerGraph({
            template,
            layerType: type,
            subtype,
            variant,
            masterConfig,
            meta: recipeMeta,
            t,
          })
          if (graph) {
            newLayer.nodes = graph.nodes
            newLayer.edges = graph.edges
            newLayer.lanes = graph.lanes
          }
        }

        const newLayers = [...s.layers, newLayer]
        const newState = {
          ...s,
          layers: newLayers,
          activeLayerId: layerId,
          showOnboarding: false,
          expandedNodeId: null,
          peekNodeIds: [] as string[],
          // Update meta for impasto layers
          ...(type === 'impasto' ? { meta: { ...s.meta, type: subtype, subtype: variant } } : {}),
        }
        return {
          layers: newLayers,
          activeLayerId: layerId,
          showOnboarding: false,
          expandedNodeId: null,
          peekNodeIds: [],
          ...(type === 'impasto' ? { meta: { ...s.meta, type: subtype, subtype: variant } } : {}),
          ...rebuildAllFlowNodes(newState),
        }
      })
    },

    updateLayerSubtype: (layerId, subtype, variant) => {
      saveSnapshot()
      set((s) => {
        const layers = s.layers.map((l) => {
          if (l.id !== layerId) return l
          const updated = { ...l, subtype, variant }
          // Sync the *Type field inside masterConfig.config
          switch (updated.masterConfig.type) {
            case 'sauce':
              updated.masterConfig = { type: 'sauce', config: { ...updated.masterConfig.config, sauceType: subtype } }
              break
            case 'prep':
              updated.masterConfig = { type: 'prep', config: { ...updated.masterConfig.config, prepType: subtype } }
              break
            case 'ferment':
              updated.masterConfig = { type: 'ferment', config: { ...updated.masterConfig.config, fermentType: subtype } }
              break
            case 'pastry':
              updated.masterConfig = { type: 'pastry', config: { ...updated.masterConfig.config, pastryType: subtype } }
              break
            case 'impasto':
              // For impasto, subtype maps to meta.type (pane, pizza, etc.)
              break
          }
          return updated
        })
        return { layers }
      })
    },

    updateLayerVariant: (layerId, variant) => {
      saveSnapshot()
      set((s) => ({
        layers: s.layers.map((l) => l.id === layerId ? { ...l, variant } : l),
      }))
    },

    removeLayer: (layerId) => {
      saveSnapshot()
      set((s) => {
        const filtered = s.layers.filter(l => l.id !== layerId)

        // Remove cross-edges referencing this layer
        const newCrossEdges = s.crossEdges.filter(
          e => e.sourceLayerId !== layerId && e.targetLayerId !== layerId,
        )

        // Removing last layer → show onboarding
        if (filtered.length === 0) {
          return {
            layers: [],
            activeLayerId: '',
            crossEdges: [],
            showOnboarding: true,
            flowNodes: [],
            flowEdges: [],
            expandedNodeId: null,
            peekNodeIds: [],
          }
        }

        const newActiveId = s.activeLayerId === layerId
          ? filtered[0].id
          : s.activeLayerId

        // If active layer changed, rebuild flow
        if (newActiveId !== s.activeLayerId) {
          return {
            layers: filtered,
            activeLayerId: newActiveId,
            crossEdges: newCrossEdges,
            ...rebuildAllFlowNodes({ ...s, layers: filtered, activeLayerId: newActiveId, expandedNodeId: null, peekNodeIds: [] }),
            expandedNodeId: null,
            peekNodeIds: [],
          }
        }
        return {
          layers: filtered,
          crossEdges: newCrossEdges,
          ...rebuildAllFlowNodes({ ...s, layers: filtered, crossEdges: newCrossEdges }),
        }
      })
    },

    duplicateLayer: (layerId) => {
      saveSnapshot()
      set((s) => {
        const source = s.layers.find(l => l.id === layerId)
        if (!source) return s
        const newId = `layer_${source.type}_${Date.now().toString(36)}`
        const duplicate: RecipeLayer = {
          ...JSON.parse(JSON.stringify(source)),
          id: newId,
          name: `${source.name} (copy)`,
          position: s.layers.length,
        }
        return {
          layers: [...s.layers, duplicate],
        }
      })
    },

    updateLayer: (layerId, patch) => {
      set((s) => {
        const newLayers = s.layers.map(l => l.id === layerId ? { ...l, ...patch } : l)
        // If visibility or locked changed, rebuild flow to reflect on canvas
        if ('visible' in patch || 'locked' in patch) {
          return {
            layers: newLayers,
            ...rebuildAllFlowNodes({ ...s, layers: newLayers }),
          }
        }
        return { layers: newLayers }
      })
    },

    reorderLayers: (orderedIds) => {
      set((s) => {
        const reordered = orderedIds
          .map((id, i) => {
            const layer = s.layers.find(l => l.id === id)
            return layer ? { ...layer, position: i } : null
          })
          .filter((l): l is RecipeLayer => l !== null)
        return { layers: reordered }
      })
    },

    addCrossEdge: (source, target) => {
      saveSnapshot()
      set((s) => {
        const edgeId = `xe_${source.layerId}_${source.nodeId}__${target.layerId}_${target.nodeId}`
        // Prevent duplicates
        if (s.crossEdges.some(e => e.id === edgeId)) return s
        const newEdge: CrossLayerEdge = {
          id: edgeId,
          sourceLayerId: source.layerId,
          sourceNodeId: source.nodeId,
          targetLayerId: target.layerId,
          targetNodeId: target.nodeId,
          data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
        }
        return {
          crossEdges: [...s.crossEdges, newEdge],
        }
      })
    },

    removeCrossEdge: (edgeId) => {
      saveSnapshot()
      set((s) => ({
        crossEdges: s.crossEdges.filter(e => e.id !== edgeId),
      }))
    },

    setViewMode: async (mode) => {
      if (mode === 'panoramica') {
        const s = get()
        const mergedNodes: Node<BaseNodeData>[] = []
        const mergedEdges: Edge[] = []

        // Compute panoramica for critical path info
        const panoramica = await computePanoramicaRPC(s.layers, s.meta, s.crossEdges)
        const criticalNodeIds = new Set<string>()
        const criticalEdgeIds = new Set<string>()
        const criticalLayer = panoramica.layers.find(l => l.layerId === panoramica.criticalLayerId)
        if (criticalLayer) {
          for (const nodeId of criticalLayer.criticalPath) {
            criticalNodeIds.add(`${criticalLayer.layerId}:${nodeId}`)
          }
          // Build set of edges on the critical path (connecting consecutive critical nodes)
          for (let i = 0; i < criticalLayer.criticalPath.length - 1; i++) {
            const src = criticalLayer.criticalPath[i]
            const tgt = criticalLayer.criticalPath[i + 1]
            const layer = s.layers.find(l => l.id === criticalLayer.layerId)
            if (layer) {
              const edge = layer.edges.find(e => e.source === src && e.target === tgt)
              if (edge) criticalEdgeIds.add(`${layer.id}:${edge.id}`)
            }
          }
        }

        for (const layer of s.layers) {
          if (!layer.visible) continue
          for (const node of layer.nodes) {
            const namespacedId = `${layer.id}:${node.id}`
            const dur = getNodeDuration(node, s.meta.type, s.meta.subtype, DEFAULT_PORTIONING.thickness)
            mergedNodes.push({
              id: namespacedId,
              type: node.type,
              position: { x: node.position.x + layer.position * 400, y: node.position.y },
              draggable: true,
              connectable: false,
              data: {
                ...toFlowNode(node, dur, () => {}).data,
                isCriticalPath: criticalNodeIds.has(namespacedId),
              },
            })
          }
          for (const edge of layer.edges) {
            const edgeNsId = `${layer.id}:${edge.id}`
            mergedEdges.push({
              id: edgeNsId,
              source: `${layer.id}:${edge.source}`,
              target: `${layer.id}:${edge.target}`,
              type: 'recipe',
              data: { ...edge.data, isCriticalPath: criticalEdgeIds.has(edgeNsId) },
            })
          }
        }

        // Add cross-layer edges with dashed style
        for (const ce of s.crossEdges) {
          mergedEdges.push({
            id: ce.id,
            source: `${ce.sourceLayerId}:${ce.sourceNodeId}`,
            target: `${ce.targetLayerId}:${ce.targetNodeId}`,
            type: 'recipe',
            data: ce.data,
            style: { strokeDasharray: '8,6', stroke: '#8b5cf6' },
          })
        }

        // Auto-layout the merged panoramica graph top-to-bottom
        const tempNodes: RecipeNode[] = mergedNodes.map(n => ({
          id: n.id,
          type: n.type as NodeTypeKey,
          subtype: null,
          position: n.position,
          lane: 'main',
          data: (n.data as BaseNodeData).nodeData,
        }))
        const tempEdges: RecipeEdge[] = mergedEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
        }))
        const tempGraph: RecipeGraph = {
          nodes: tempNodes,
          edges: tempEdges,
          lanes: [{ id: 'main', label: 'Panoramica', isMain: true, origin: { type: 'user' as const } }],
        }
        const laidOut = autoLayout(tempGraph)
        for (const laidNode of laidOut.nodes) {
          const mNode = mergedNodes.find(n => n.id === laidNode.id)
          if (mNode) mNode.position = laidNode.position
        }

        set({ viewMode: mode, flowNodes: mergedNodes, flowEdges: mergedEdges })
      } else {
        // Restore from active layer
        set((s) => ({
          viewMode: mode,
          ...rebuildAllFlowNodes(s),
        }))
      }
    },

    setInactiveLayerOpacity: (opacity) => {
      set((s) => {
        const newState = { ...s, inactiveLayerOpacity: opacity }
        return { inactiveLayerOpacity: opacity, ...rebuildAllFlowNodes(newState) }
      })
    },

    toggleAutoResolve: () => set((s) => ({ autoResolveEnabled: !s.autoResolveEnabled })),

    toRecipeV3: () => {
      const s = get()
      return {
        version: 3 as const,
        meta: s.meta,
        ingredientGroups: s.ingredientGroups,
        layers: s.layers,
        crossEdges: s.crossEdges,
      }
    },
  }
})

// ── Convenience selectors (backward-compat for consumers) ──────

/**
 * Select graph fields from the active layer.
 * Use with useRecipeFlowStore(selectGraph) + useShallow to avoid infinite re-renders,
 * OR select individual fields (s => selectGraph(s).nodes) for maximum stability.
 */
const EMPTY_GRAPH: RecipeGraph = { nodes: [], edges: [], lanes: [] }
let _lastGraphLayer: RecipeLayer | undefined
let _lastGraphResult: RecipeGraph = EMPTY_GRAPH

export function selectGraph(s: RecipeFlowState): RecipeGraph {
  const layer = s.layers.find(l => l.id === s.activeLayerId) ?? s.layers[0]
  if (!layer) return EMPTY_GRAPH
  // Memoize: return same object if the layer ref hasn't changed
  if (layer === _lastGraphLayer) return _lastGraphResult
  _lastGraphLayer = layer
  _lastGraphResult = { nodes: layer.nodes, edges: layer.edges, lanes: layer.lanes, viewport: layer.viewport }
  return _lastGraphResult
}

/** Select portioning from the active layer (stable reference) */
export function selectPortioning(s: RecipeFlowState): Portioning {
  const layer = s.layers.find(l => l.id === s.activeLayerId) ?? s.layers[0]
  if (!layer) return DEFAULT_PORTIONING
  if (layer.masterConfig.type === 'impasto') return layer.masterConfig.config
  return DEFAULT_PORTIONING
}
