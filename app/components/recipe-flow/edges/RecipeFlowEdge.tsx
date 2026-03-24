import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'

interface RecipeEdgeData extends Record<string, unknown> {
  scheduleTimeRatio: number
  scheduleQtyRatio: number
  label?: string
}

function RecipeFlowEdgeInner({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<RecipeEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const timeRatio = data?.scheduleTimeRatio ?? 1
  const qtyRatio = data?.scheduleQtyRatio ?? 1
  const hasCustomValues = timeRatio < 1 || qtyRatio < 1 || data?.label

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#b8a08a',
          strokeWidth: 2,
          strokeDasharray: timeRatio < 1 ? '6 4' : undefined,
          cursor: 'pointer',
        }}
      />
      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />
      {hasCustomValues && (
        <EdgeLabelRenderer>
          <div
            className="absolute text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white border border-[#e0d5c8] text-[#8a7a66] shadow-sm pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {data?.label || (timeRatio < 1 ? `⏱ al ${Math.round(timeRatio * 100)}%` : `📦 al ${Math.round(qtyRatio * 100)}%`)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const RecipeFlowEdge = memo(RecipeFlowEdgeInner)
