import { useReactFlow } from '@xyflow/react'
import { useMemo } from 'react'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'

const LANE_COLORS: Record<string, string> = {
  main: 'rgba(212,165,116,0.06)',
  // Auto-generated lanes use pastel colors
}

const PASTEL_COLORS = [
  'rgba(46,110,46,0.06)',   // green (prep)
  'rgba(112,64,160,0.06)',  // purple (split)
  'rgba(138,64,96,0.06)',   // rose (post_bake)
  'rgba(90,100,112,0.06)',  // gray-blue
  'rgba(122,106,32,0.06)',  // olive
]

export function LaneBackgrounds() {
  const graph = useRecipeFlowStore((s) => s.graph)
  const lanes = graph.lanes

  // Group nodes by lane
  const laneBounds = useMemo(() => {
    const bounds: Record<string, { minX: number; maxX: number; minY: number; maxY: number; label: string }> = {}

    for (const lane of lanes) {
      const laneNodes = graph.nodes.filter((n) => n.lane === lane.id)
      if (laneNodes.length === 0) continue

      const xs = laneNodes.map((n) => n.position.x)
      const ys = laneNodes.map((n) => n.position.y)
      bounds[lane.id] = {
        minX: Math.min(...xs) - 30,
        maxX: Math.max(...xs) + 250,
        minY: Math.min(...ys) - 30,
        maxY: Math.max(...ys) + 110,
        label: lane.label,
      }
    }

    return bounds
  }, [graph.nodes, lanes])

  return (
    <>
      {Object.entries(laneBounds).map(([laneId, b], i) => {
        const color = LANE_COLORS[laneId] || PASTEL_COLORS[i % PASTEL_COLORS.length]
        return (
          <div
            key={laneId}
            className="absolute rounded-xl pointer-events-none"
            style={{
              left: b.minX,
              top: b.minY,
              width: b.maxX - b.minX,
              height: b.maxY - b.minY,
              backgroundColor: color,
              border: `1px dashed ${color.replace(/[\d.]+\)$/, '0.2)')}`,
            }}
          >
            <span
              className="absolute -top-3 left-3 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80"
              style={{ color: color.replace(/[\d.]+\)$/, '0.6)') }}
            >
              {b.label}
            </span>
          </div>
        )
      })}
    </>
  )
}
