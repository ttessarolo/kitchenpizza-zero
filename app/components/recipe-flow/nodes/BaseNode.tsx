import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { STEP_TYPES, COLOR_MAP } from '@/local_data'
import { fmtDuration } from '@commons/utils/recipe'
import type { NodeData, NodeTypeKey } from '@commons/types/recipe-graph'

export interface FlowSummary {
  label: string
  grams: number
}

export interface BaseNodeData extends Record<string, unknown> {
  nodeData: NodeData
  nodeType: NodeTypeKey
  nodeSubtype: string | null
  duration: number
  isSelected?: boolean
  isPeek?: boolean
  isError?: boolean
  inFlow?: FlowSummary[]     // what enters the node (from parents)
  outFlow?: FlowSummary[]    // what exits the node (own ingredients + inherited)
  onExpand?: (id: string) => void
}

/** Generate a short preview line based on node type and data */
function getPreview(type: NodeTypeKey, d: NodeData): string | null {
  const parts: string[] = []

  if (type === 'dough' || type === 'pre_dough' || type === 'pre_ferment') {
    if (d.flours.length > 0) parts.push(d.flours.map((f) => `${f.type} ${f.g}g`).join(', '))
    if (d.liquids.length > 0) parts.push(d.liquids.map((l) => `${l.type} ${l.g}g`).join(', '))
  } else if (type === 'bake' && d.ovenCfg) {
    parts.push(`${d.ovenCfg.temp}°C`)
    if (d.ovenCfg.ovenMode) parts.push(d.ovenCfg.ovenMode === 'fan' ? 'ventilato' : 'statico')
  } else if (type === 'rise' && d.riseMethod) {
    const methods: Record<string, string> = { room: 'Ambiente', fridge: 'Frigo', ctrl18: '18°C', ctrl12: '12°C' }
    parts.push(methods[d.riseMethod] || d.riseMethod)
  } else if (type === 'shape' && d.shapeCount) {
    parts.push(`${d.shapeCount} pezzi`)
  } else if (type === 'prep') {
    if (d.cookMethod) parts.push(d.cookMethod)
    if (d.cutStyle) parts.push(d.cutStyle)
    if (d.extras.length > 0) parts.push(d.extras.map((e) => e.name).join(', '))
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

function BaseNodeInner({ id, data }: NodeProps<BaseNodeData>) {
  const { nodeData, nodeType, nodeSubtype, duration, isSelected, isPeek, isError } = data
  const inFlow = data.inFlow ?? []
  const outFlow = data.outFlow ?? []
  const cm = COLOR_MAP[nodeType] || COLOR_MAP.dough
  const typeEntry = STEP_TYPES.find((t) => t.key === nodeType)
  const subtypeEntry = typeEntry?.subtypes?.find((s) => s.key === nodeSubtype)
  const preview = getPreview(nodeType, nodeData)

  const borderStyle = isError
    ? { borderColor: '#dc2626', borderWidth: 3, boxShadow: '0 4px 20px rgba(220,38,38,0.2)' }
    : isSelected
      ? { borderColor: cm.tx, borderWidth: 3, boxShadow: `0 4px 20px ${cm.tx}30` }
      : isPeek
        ? { borderColor: cm.tx + '80', borderWidth: 2, borderStyle: 'dashed' as const }
        : { borderColor: cm.tx + '40', borderWidth: 2 }

  return (
    <div
      className="rounded-2xl shadow-sm w-[360px] cursor-pointer transition-all hover:shadow-md"
      style={{
        backgroundColor: isError ? undefined : cm.bg,
        backgroundImage: isError
          ? 'repeating-linear-gradient(135deg, #fef2f2, #fef2f2 8px, #fecaca 8px, #fecaca 10px)'
          : undefined,
        ...borderStyle,
      }}
    >
      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3.5 !h-3.5 !border-2 !bg-white"
        style={{ borderColor: cm.tx }}
      />

      <div className="px-5 py-3.5">
        {/* Header: icon + title + duration badge */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl shrink-0">{typeEntry?.icon || '📋'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate leading-tight" style={{ color: cm.tx }}>
              {nodeData.title || typeEntry?.label || nodeType}
            </div>
            <div className="text-sm opacity-70 truncate" style={{ color: cm.tx }}>
              {cm.lb}
              {subtypeEntry ? ` · ${subtypeEntry.label}` : ''}
              {' · '}
              {fmtDuration(duration)}
            </div>
          </div>
        </div>

        {/* Preview line */}
        {preview && (
          <div
            className="text-xs mt-1.5 truncate opacity-60"
            style={{ color: cm.tx }}
          >
            {preview}
          </div>
        )}

        {/* IN / OUT flow box — always show for debugging */}
        <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: cm.tx + '25' }}>
          <div className="flex items-start gap-1.5 text-[10px]" style={{ color: cm.tx }}>
            <span className="font-bold opacity-50 shrink-0 w-6">IN</span>
            <span className="opacity-60 truncate">
              {inFlow.length > 0
                ? inFlow.map((f) => `${f.label} ${f.grams}g`).join(' · ')
                : '—'}
            </span>
          </div>
          <div className="flex items-start gap-1.5 text-[10px] mt-0.5" style={{ color: cm.tx }}>
            <span className="font-bold opacity-50 shrink-0 w-6">OUT</span>
            <span className="opacity-60 truncate">
              {outFlow.length > 0
                ? outFlow.map((f) => `${f.label} ${f.grams}g`).join(' · ')
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3.5 !h-3.5 !border-2 !bg-white"
        style={{ borderColor: cm.tx }}
      />
    </div>
  )
}

export const BaseNode = memo(BaseNodeInner)
