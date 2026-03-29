/**
 * GraphMutationEngine — Pure graph/portioning mutation functions.
 *
 * Extracted from recipe-flow-store.ts to enable:
 * 1. RecipeAutoCorrectManager (iterative solver) to apply mutations without store
 * 2. Store to delegate mutation logic to this shared utility
 *
 * All functions are pure: no side effects, no React, no store access.
 */

import type {
  RecipeGraph, RecipeNode, RecipeEdge,
  ActionableWarning, NodeRef, GraphMutation,
  NodeData,
} from '@commons/types/recipe-graph'
import type { Portioning } from '@commons/types/recipe'

// ── Resolve NodeRef → actual node ID ──────────────────────────

/**
 * Walk the graph edges to resolve a relative NodeRef to an actual node ID.
 */
export function resolveNodeRef(
  ref: NodeRef,
  sourceNodeId: string | undefined,
  nodes: RecipeNode[],
  edges: RecipeEdge[],
): string | null {
  if (ref.ref === 'self') return sourceNodeId ?? null

  if (ref.ref === 'upstream_dough' && sourceNodeId) {
    const visited = new Set<string>()
    const queue = edges.filter((e) => e.target === sourceNodeId).map((e) => e.source)
    while (queue.length) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      const n = nodes.find((x) => x.id === id)
      if (n?.type === 'dough') return n.id
      edges.filter((e) => e.target === id).forEach((e) => queue.push(e.source))
    }
  }

  if ((ref.ref === 'downstream_rise' || ref.ref === 'downstream_bake') && sourceNodeId) {
    const targetType = ref.ref === 'downstream_rise' ? 'rise' : 'bake'
    const visited = new Set<string>()
    const queue = edges.filter((e) => e.source === sourceNodeId).map((e) => e.target)
    while (queue.length) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      const n = nodes.find((x) => x.id === id)
      if (n?.type === targetType) return n.id
      edges.filter((e) => e.source === id).forEach((e) => queue.push(e.target))
    }
  }

  return null
}

// ── Resolve patch values (_contextRef:, _ prefix, dotted paths) ──

/**
 * Resolve context references and dotted paths in a mutation patch.
 *
 * Handles:
 * - `_contextRef:equivalentRoomHours` → looks up ctx["equivalentRoomHours"]
 * - `_maxBaseDur` → looks up ctx["_maxBaseDur"]
 * - `ovenCfg.temp` → nested merge into existing object
 */
export function resolvePatchValues(
  rawPatch: Record<string, unknown>,
  nodeId: string,
  nodes: RecipeNode[],
  warning: ActionableWarning,
): Record<string, unknown> {
  const node = nodes.find((n) => n.id === nodeId)
  const ctx = warning._ctx ?? {}
  const result: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(rawPatch)) {
    let resolvedVal = val

    if (typeof val === 'string') {
      let ctxKey: string | null = null
      if (val.startsWith('_contextRef:')) {
        ctxKey = val.slice('_contextRef:'.length)
      } else if (val.startsWith('_')) {
        ctxKey = val
      }

      if (ctxKey !== null) {
        if (ctx[ctxKey] !== undefined) {
          resolvedVal = ctx[ctxKey]
        } else if (ctx[`_${ctxKey}`] !== undefined) {
          resolvedVal = ctx[`_${ctxKey}`]
        } else if (warning.messageVars?.[ctxKey] !== undefined) {
          resolvedVal = warning.messageVars[ctxKey]
        } else if (warning.messageVars?.[ctxKey.replace(/^_/, '')] !== undefined) {
          resolvedVal = warning.messageVars[ctxKey.replace(/^_/, '')]
        }
      }
    }

    if (key.includes('.')) {
      const parts = key.split('.')
      const topKey = parts[0]
      const subKey = parts.slice(1).join('.')
      const existing = (node?.data as Record<string, unknown>)?.[topKey] ?? result[topKey] ?? {}
      result[topKey] = { ...(typeof existing === 'object' ? existing : {}), [subKey]: resolvedVal }
    } else {
      result[key] = resolvedVal
    }
  }

  return result
}

// ── Resolve portioning patch values ──

/**
 * Resolve context references in a portioning patch (no dotted paths needed).
 */
export function resolvePortioningPatch(
  rawPatch: Record<string, unknown>,
  warning: ActionableWarning,
): Record<string, unknown> {
  const ctx = warning._ctx ?? {}
  const result: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(rawPatch)) {
    let resolvedVal = val

    if (typeof val === 'string') {
      let ctxKey: string | null = null
      if (val.startsWith('_contextRef:')) {
        ctxKey = val.slice('_contextRef:'.length)
      } else if (val.startsWith('_')) {
        ctxKey = val
      }

      if (ctxKey !== null) {
        if (ctx[ctxKey] !== undefined) {
          resolvedVal = ctx[ctxKey]
        } else if (ctx[`_${ctxKey}`] !== undefined) {
          resolvedVal = ctx[`_${ctxKey}`]
        } else if (warning.messageVars?.[ctxKey] !== undefined) {
          resolvedVal = warning.messageVars[ctxKey]
        } else if (warning.messageVars?.[ctxKey.replace(/^_/, '')] !== undefined) {
          resolvedVal = warning.messageVars[ctxKey.replace(/^_/, '')]
        }
      }
    }

    result[key] = resolvedVal
  }

  return result
}

// ── Apply a single warning action → pure graph + portioning ──

/**
 * Apply all mutations from a warning action to produce a new graph + portioning.
 * Pure function — no store, no React Flow, no autoLayout.
 */
export function applyWarningActionPure(
  warning: ActionableWarning,
  actionIdx: number,
  graph: RecipeGraph,
  portioning: Portioning,
): { graph: RecipeGraph; portioning: Portioning } {
  const action = warning.actions?.[actionIdx]
  if (!action) return { graph, portioning }

  const srcId = warning.sourceNodeId
  let nodes = [...graph.nodes.map((n) => ({ ...n, data: { ...n.data } }))]
  let edges = [...graph.edges]
  let port = { ...portioning }

  for (const m of action.mutations) {
    const targetId = 'target' in m ? resolveNodeRef(m.target as NodeRef, srcId, nodes, edges) : null

    switch (m.type) {
      case 'updateNode': {
        if (targetId) {
          const patch = resolvePatchValues(m.patch as Record<string, unknown>, targetId, nodes, warning)
          // Sync ovenCfg patch into cookingCfg for forno/pentola nodes
          if (patch.ovenCfg) {
            const node = nodes.find((n) => n.id === targetId)
            const cc = node?.data.cookingCfg
            if (cc && (cc.method === 'forno' || cc.method === 'pentola')) {
              patch.cookingCfg = { ...cc, cfg: patch.ovenCfg }
            }
          }
          nodes = nodes.map((n) =>
            n.id === targetId ? { ...n, data: { ...n.data, ...patch } } : n,
          )
        }
        break
      }

      case 'addNodeAfter': {
        const afterId = targetId ?? srcId
        if (afterId) {
          const afterNode = nodes.find((n) => n.id === afterId)
          const newId = `${m.nodeType}_ac_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

          const newNode: RecipeNode = {
            id: newId,
            type: m.nodeType as RecipeNode['type'],
            subtype: m.subtype ?? null,
            position: {
              x: (afterNode?.position.x ?? 0),
              y: (afterNode?.position.y ?? 0) + 120,
            },
            lane: afterNode?.lane ?? 'main',
            data: {
              title: '',
              desc: '',
              group: afterNode?.data.group ?? 'Impasto',
              baseDur: 10,
              restDur: 0,
              restTemp: null,
              flours: [],
              liquids: [],
              extras: [],
              yeasts: [],
              salts: [],
              sugars: [],
              fats: [],
              ...(m.data || {}),
              advisorySourceId: warning.id,
            } as NodeData,
          }

          const newEdge: RecipeEdge = {
            id: `e_${afterId}__${newId}`,
            source: afterId,
            target: newId,
            data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
          }

          // Re-route edges from afterNode to go through newNode
          const outEdges = edges.filter((e) => e.source === afterId)
          const keptEdges = edges.filter((e) => e.source !== afterId)
          const reroutedEdges = outEdges.map((e) => ({
            ...e,
            id: `e_${newId}__${e.target}`,
            source: newId,
          }))

          nodes = [...nodes, newNode]
          edges = [...keptEdges, newEdge, ...reroutedEdges]
        }
        break
      }

      case 'removeNode': {
        if (targetId) {
          const inEdges = edges.filter((e) => e.target === targetId)
          const outEdges = edges.filter((e) => e.source === targetId)
          // Reconnect: parents → children
          const reconnected: RecipeEdge[] = []
          for (const ie of inEdges) {
            for (const oe of outEdges) {
              reconnected.push({
                id: `e_${ie.source}__${oe.target}`,
                source: ie.source,
                target: oe.target,
                data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
              })
            }
          }
          nodes = nodes.filter((n) => n.id !== targetId)
          edges = edges.filter((e) => e.source !== targetId && e.target !== targetId)
          edges = [...edges, ...reconnected]
        }
        break
      }

      case 'updatePortioning': {
        const resolvedPatch = resolvePortioningPatch(m.patch as Record<string, unknown>, warning)
        port = { ...port, ...resolvedPatch }
        break
      }
    }
  }

  return {
    graph: { ...graph, nodes, edges },
    portioning: port,
  }
}
