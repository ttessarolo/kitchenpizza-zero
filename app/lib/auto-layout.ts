import dagre from '@dagrejs/dagre'
import type { RecipeGraph } from '@commons/types/recipe-graph'
import { pickHandles } from './handle-router'

export const NODE_WIDTH = 380
export const NODE_HEIGHT = 110

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

function hashId(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Serpentine layout: main lane nodes zigzag left-right going top to bottom.
 * Parallel lanes (prep, split branches) use dagre for correct spacing.
 */
export function autoLayout(graph: RecipeGraph): RecipeGraph {
  if (graph.nodes.length === 0) return graph

  // Step 1: dagre for topological order + parallel branch positioning
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 140, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of graph.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target)
  }
  dagre.layout(g)

  // Step 2: Separate main lane from other lanes
  const mainNodes = graph.nodes.filter((n) => n.lane === 'main')
  const otherNodes = graph.nodes.filter((n) => n.lane !== 'main')

  // Sort main by dagre Y (topological order)
  const mainSorted = mainNodes
    .map((n) => ({ node: n, dy: g.node(n.id).y }))
    .sort((a, b) => a.dy - b.dy)
    .map((x) => x.node)

  // Step 3: Serpentine — alternating left/right, flowing top to bottom
  const ZIGZAG_OFFSET = 420 // horizontal offset between left and right positions
  const ROW_GAP = 160       // vertical gap between nodes (room for edge curves)
  const LEFT_X = 0
  const RIGHT_X = ZIGZAG_OFFSET

  const positions = new Map<string, { x: number; y: number }>()
  let currentY = 0

  mainSorted.forEach((node, i) => {
    const isRight = i % 2 === 1
    const h = hashId(node.id)
    const jitterX = (seededRandom(h) - 0.5) * 50     // ±25px
    const jitterY = (seededRandom(h + 1) - 0.5) * 30  // ±15px
    positions.set(node.id, {
      x: (isRight ? RIGHT_X : LEFT_X) + jitterX,
      y: currentY + jitterY,
    })
    currentY += NODE_HEIGHT + ROW_GAP
  })

  // Step 4: Position parallel-lane nodes to the right of the main serpentine
  const mainAreaRight = RIGHT_X + NODE_WIDTH + 80

  for (const node of otherNodes) {
    const dagrePos = g.node(node.id)
    if (dagrePos) {
      const h = hashId(node.id)
      const jx = (seededRandom(h + 2) - 0.5) * 30
      const jy = (seededRandom(h + 3) - 0.5) * 20
      positions.set(node.id, {
        x: mainAreaRight + (dagrePos.x - g.node(node.id).x) * 0.5 + jx,
        y: dagrePos.y - NODE_HEIGHT / 2 + jy,
      })
    }
  }

  // Step 5: Assign optimal handles to edges based on node positions
  const edgesWithHandles = graph.edges.map((e) => {
    const sourcePos = positions.get(e.source)
    const targetPos = positions.get(e.target)
    if (!sourcePos || !targetPos) return e

    // Don't override split/join handles (they use dynamic handles)
    const sourceNode = graph.nodes.find((n) => n.id === e.source)
    const targetNode = graph.nodes.find((n) => n.id === e.target)
    if (sourceNode?.type === 'split' || targetNode?.type === 'join') return e

    const handles = pickHandles(sourcePos, targetPos)
    return {
      ...e,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
    }
  })

  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      position: positions.get(n.id) ?? { x: 0, y: 0 },
    })),
    edges: edgesWithHandles,
  }
}
