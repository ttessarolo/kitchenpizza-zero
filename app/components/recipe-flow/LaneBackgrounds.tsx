import { useMemo } from 'react'
import { useRecipeFlowStore, selectGraph } from '~/stores/recipe-flow-store'
import { stepColor } from '~/lib/theme-colors'

/** Map lane IDs to their associated step type for color derivation */
const LANE_STEP_TYPES: Record<string, string> = {
  main: 'dough',
}

const FALLBACK_STEP_TYPES = [
  'prep', 'split', 'post-bake', 'shape', 'rest',
]

export function LaneBackgrounds() {
  const graph = useRecipeFlowStore(selectGraph)
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
        const stepType = LANE_STEP_TYPES[laneId] || FALLBACK_STEP_TYPES[i % FALLBACK_STEP_TYPES.length]
        const bgColor = stepColor(`step-${stepType}-tx`, 0.06)
        const borderColor = stepColor(`step-${stepType}-tx`, 0.2)
        const labelColor = stepColor(`step-${stepType}-tx`, 0.6)

        return (
          <div
            key={laneId}
            className="absolute rounded-xl pointer-events-none"
            style={{
              left: b.minX,
              top: b.minY,
              width: b.maxX - b.minX,
              height: b.maxY - b.minY,
              backgroundColor: bgColor,
              border: `1px dashed ${borderColor}`,
            }}
          >
            <span
              className="absolute -top-3 left-3 text-[9px] font-semibold font-sketch uppercase tracking-wider px-1.5 py-0.5 rounded bg-card/80"
              style={{ color: labelColor }}
            >
              {b.label}
            </span>
          </div>
        )
      })}
    </>
  )
}
