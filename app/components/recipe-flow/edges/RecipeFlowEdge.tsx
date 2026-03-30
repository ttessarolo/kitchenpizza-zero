import { memo, useMemo } from 'react'
import {
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'
import rough from 'roughjs'
import { useT } from '~/hooks/useTranslation'
import { getResolvedColor } from '~/lib/theme-colors'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import type { EdgeStyle } from '@commons/types/recipe-graph'

interface RecipeEdgeData extends Record<string, unknown> {
  scheduleTimeRatio: number
  scheduleQtyRatio: number
  label?: string
  curvature?: number
  isCriticalPath?: boolean
  style?: EdgeStyle
}

// ── Rough.js helpers ────────────────────────────────────────────

function roughPathToSvg(
  pathData: string,
  options: {
    stroke: string
    strokeWidth: number
    roughness: number
    bowing: number
    strokeLineDash?: number[]
  },
): string {
  if (typeof document === 'undefined') return ''
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const rc = rough.svg(svg)
  const node = rc.path(pathData, {
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    roughness: options.roughness,
    bowing: options.bowing,
    fill: 'none',
    strokeLineDash: options.strokeLineDash,
  })
  svg.appendChild(node)
  return node.innerHTML
}

function roughLineToSvg(
  x1: number, y1: number, x2: number, y2: number,
  options: { stroke: string; strokeWidth: number; roughness: number },
): string {
  if (typeof document === 'undefined') return ''
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const rc = rough.svg(svg)
  const node = rc.line(x1, y1, x2, y2, {
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    roughness: options.roughness,
    fill: 'none',
  })
  svg.appendChild(node)
  return node.innerHTML
}

// ── Style resolution helpers ────────────────────────────────────

const STROKE_WIDTH_MAP = { thin: 2, medium: 3.5, thick: 5 } as const
const ROUGHNESS_MAP = { low: 0.8, medium: 1.8, high: 3.0 } as const
const DASH_MAP = {
  solid: undefined,
  dashed: [8, 5],
  dotted: [3, 4],
} as const

// ── Edge path builders ──────────────────────────────────────────

function buildCurvedPath(sx: number, sy: number, tx: number, ty: number, curvature: number): string {
  const dy = ty - sy
  const dx = tx - sx
  const curveStrength = curvature * Math.max(Math.abs(dy), 80)
  // Offset control points both vertically AND horizontally for natural arcs
  const cpx1 = sx + dx * 0.15
  const cpy1 = sy + curveStrength
  const cpx2 = tx - dx * 0.15
  const cpy2 = ty - curveStrength
  return `M ${sx} ${sy} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${tx} ${ty}`
}

function buildSCurvePath(sx: number, sy: number, tx: number, ty: number, curvature: number): string {
  const midY = (sy + ty) / 2
  const dx = tx - sx
  const sOffset = Math.max(Math.abs(dx) * 0.5, 60) * curvature
  return `M ${sx} ${sy} C ${sx + sOffset} ${sy}, ${sx + sOffset} ${midY}, ${(sx + tx) / 2} ${midY} S ${tx - sOffset} ${ty}, ${tx} ${ty}`
}

function buildStraightPath(sx: number, sy: number, tx: number, ty: number, curvature: number): string {
  const controlPointOffset = Math.abs(ty - sy) * curvature * 0.5
  return `M ${sx} ${sy} C ${sx} ${sy + controlPointOffset}, ${tx} ${ty - controlPointOffset}, ${tx} ${ty}`
}

// ── Component ───────────────────────────────────────────────────

function RecipeFlowEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<Edge<RecipeEdgeData>>) {
  const t = useT()
  const updateEdgeCurvature = useRecipeFlowStore((s) => s.updateEdgeCurvature)
  const curvature = data?.curvature ?? 0.25
  const style = data?.style

  // Resolve style values
  const arrowType = style?.arrowType ?? 'curved'
  const showArrowHead = (style?.arrowHead ?? 'arrow') !== 'none'
  const strokeW = STROKE_WIDTH_MAP[style?.strokeWidth ?? 'medium']
  const roughnessVal = ROUGHNESS_MAP[style?.roughness ?? 'medium']
  const isCritical = data?.isCriticalPath === true
  const timeRatio = data?.scheduleTimeRatio ?? 1
  const isDashed = timeRatio < 1
  const strokeDash: number[] | undefined = isDashed ? [8, 5] : (DASH_MAP[style?.strokeStyle ?? 'solid'] as number[] | undefined)
  const opacity = (style?.opacity ?? 100) / 100

  // Resolve color
  const resolvedColor = style?.strokeColor
    ? style.strokeColor
    : isCritical
      ? getResolvedColor('critical')
      : getResolvedColor('canvas-edge')

  // Build edge path based on arrow type
  const edgePath = useMemo(() => {
    switch (arrowType) {
      case 's-curve': return buildSCurvePath(sourceX, sourceY, targetX, targetY, curvature)
      case 'straight': return buildStraightPath(sourceX, sourceY, targetX, targetY, curvature)
      case 'curved':
      default: return buildCurvedPath(sourceX, sourceY, targetX, targetY, curvature)
    }
  }, [arrowType, sourceX, sourceY, targetX, targetY, curvature])

  // Label position at midpoint
  const labelX = (sourceX + targetX) / 2
  const labelY = (sourceY + targetY) / 2

  const qtyRatio = data?.scheduleQtyRatio ?? 1
  const hasCustomValues = timeRatio < 1 || qtyRatio < 1 || data?.label

  // Arrowhead
  const arrowMarkup = useMemo(() => {
    if (!showArrowHead) return ''
    const dx = targetX - (targetX + (sourceX - targetX) * 0.1)
    const dy = targetY - (targetY + (sourceY - targetY) * 0.1)
    const angle = Math.atan2(dy, dx)
    const arrowLen = 24
    const arrowAngle = Math.PI / 4

    const x1 = targetX - arrowLen * Math.cos(angle - arrowAngle)
    const y1 = targetY - arrowLen * Math.sin(angle - arrowAngle)
    const x2 = targetX - arrowLen * Math.cos(angle + arrowAngle)
    const y2 = targetY - arrowLen * Math.sin(angle + arrowAngle)

    if (typeof document === 'undefined') return ''

    const line1 = roughLineToSvg(x1, y1, targetX, targetY, {
      stroke: resolvedColor,
      strokeWidth: strokeW + 1.5,
      roughness: roughnessVal,
    })
    const line2 = roughLineToSvg(x2, y2, targetX, targetY, {
      stroke: resolvedColor,
      strokeWidth: strokeW + 1.5,
      roughness: roughnessVal,
    })
    return line1 + line2
  }, [sourceX, sourceY, targetX, targetY, showArrowHead, resolvedColor, strokeW, roughnessVal])

  // Rough edge path
  const roughEdgeMarkup = useMemo(() => {
    if (typeof document === 'undefined') return ''
    return roughPathToSvg(edgePath, {
      stroke: resolvedColor,
      strokeWidth: strokeW,
      roughness: roughnessVal,
      bowing: 2,
      strokeLineDash: strokeDash,
    })
  }, [edgePath, resolvedColor, strokeW, roughnessVal, strokeDash])

  return (
    <g style={{ opacity }}>
      {/* Rough.js hand-drawn edge path */}
      <g dangerouslySetInnerHTML={{ __html: roughEdgeMarkup }} />

      {/* Rough.js hand-drawn arrowhead */}
      <g dangerouslySetInnerHTML={{ __html: arrowMarkup }} />

      {/* Invisible wider click-target path */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />

      {/* Reconnection grab areas */}
      <circle cx={sourceX} cy={sourceY} r={10} fill="transparent" style={{ cursor: 'crosshair' }} />
      <circle cx={targetX} cy={targetY} r={10} fill="transparent" style={{ cursor: 'crosshair' }} />

      {hasCustomValues && (
        <EdgeLabelRenderer>
          <div
            className="absolute text-[9px] font-medium font-sketch px-1.5 py-0.5 rounded-full bg-card border border-border text-panel-header shadow-sm pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {data?.label || (timeRatio < 1 ? t("edge_time_at_pct", { pct: Math.round(timeRatio * 100) }) : t("edge_qty_at_pct", { pct: Math.round(qtyRatio * 100) }))}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Draggable curvature handle */}
      <EdgeLabelRenderer>
        <div
          className="absolute w-3 h-3 rounded-full bg-canvas-edge/40 hover:bg-canvas-edge/80 cursor-grab active:cursor-grabbing transition-colors"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            const startY = e.clientY
            const startCurvature = curvature

            const onMouseMove = (ev: MouseEvent) => {
              const deltaY = ev.clientY - startY
              const newCurvature = Math.max(0.05, Math.min(2.5, startCurvature + deltaY * 0.005))
              updateEdgeCurvature(id, newCurvature)
            }

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove)
              document.removeEventListener('mouseup', onMouseUp)
            }

            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
          }}
        />
      </EdgeLabelRenderer>
    </g>
  )
}

export const RecipeFlowEdge = memo(RecipeFlowEdgeInner)
