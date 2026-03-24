import dagre from '@dagrejs/dagre'
import type { RecipeGraph } from '@commons/types/recipe-graph'

export const NODE_WIDTH = 380
export const NODE_HEIGHT = 110

/**
 * Serpentine layout: main lane nodes zigzag left-right going top to bottom.
 * Parallel lanes (prep, split branches) use dagre for correct spacing.
 */
export function autoLayout(graph: RecipeGraph): RecipeGraph {
  if (graph.nodes.length === 0) return graph

  // Step 1: dagre for topological order + parallel branch positioning
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 50, marginx: 20, marginy: 20 })
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
  const ROW_GAP = 50        // vertical gap between nodes
  const LEFT_X = 0
  const RIGHT_X = ZIGZAG_OFFSET

  const positions = new Map<string, { x: number; y: number }>()
  let currentY = 0

  mainSorted.forEach((node, i) => {
    const isRight = i % 2 === 1
    positions.set(node.id, {
      x: isRight ? RIGHT_X : LEFT_X,
      y: currentY,
    })
    currentY += NODE_HEIGHT + ROW_GAP
  })

  // Step 4: Position parallel-lane nodes to the right of the main serpentine
  const mainAreaRight = RIGHT_X + NODE_WIDTH + 80

  for (const node of otherNodes) {
    const dagrePos = g.node(node.id)
    if (dagrePos) {
      positions.set(node.id, {
        x: mainAreaRight + (dagrePos.x - g.node(node.id).x) * 0.5,
        y: dagrePos.y - NODE_HEIGHT / 2,
      })
    }
  }

  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      position: positions.get(n.id) ?? { x: 0, y: 0 },
    })),
  }
}
