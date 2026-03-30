import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { STEP_TYPES, COLOR_MAP } from '@/local_data'
import { fmtDuration } from '@commons/utils/format'
import { useT } from '~/hooks/useTranslation'
import { stepColor } from '~/lib/theme-colors'
import { SketchyNodeWrapper, hashStringToNumber } from '~/components/recipe-flow/sketchy'
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
  layerColor?: string        // panoramica: layer color for visual grouping
  isCriticalPath?: boolean   // panoramica: node is on the critical path
  layerLocked?: boolean      // node's layer is locked — show visual indicator
}

/** Generate a short preview line based on node type and data */
function getPreview(type: NodeTypeKey, d: NodeData, t: (key: string, vars?: Record<string, unknown>) => string): string | null {
  const parts: string[] = []

  if (type === 'dough' || type === 'pre_dough' || type === 'pre_ferment') {
    if (d.flours.length > 0) parts.push(d.flours.map((f) => `${f.type} ${f.g}g`).join(', '))
    if (d.liquids.length > 0) parts.push(d.liquids.map((l) => `${l.type} ${l.g}g`).join(', '))
  } else if (type === 'bake' && d.ovenCfg) {
    parts.push(`${d.ovenCfg.temp}°C`)
    if (d.ovenCfg.ovenMode) parts.push(d.ovenCfg.ovenMode === 'fan' ? t('oven_mode_fan_short') : t('oven_mode_static_short'))
  } else if (type === 'rise' && d.riseMethod) {
    const methods: Record<string, string> = { room: t('rise_method_room'), fridge: t('rise_method_fridge'), ctrl18: '18°C', ctrl12: '12°C' }
    parts.push(methods[d.riseMethod] || d.riseMethod)
  } else if (type === 'shape' && d.shapeCount) {
    parts.push(`${d.shapeCount} ${t('label_pieces_unit')}`)
  } else if (type === 'prep') {
    if (d.cookMethod) parts.push(d.cookMethod)
    if (d.cutStyle) parts.push(d.cutStyle)
    if (d.extras.length > 0) parts.push(d.extras.map((e) => e.name).join(', '))
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

function BaseNodeInner({ id, data }: NodeProps<Node<BaseNodeData>>) {
  const t = useT()
  const { nodeData, nodeType, nodeSubtype, duration, isSelected, isPeek, isError, isCriticalPath, layerColor, layerLocked } = data
  const inFlow = data.inFlow ?? []
  const outFlow = data.outFlow ?? []
  const cm = COLOR_MAP[nodeType] || COLOR_MAP.dough
  const typeEntry = STEP_TYPES.find((t) => t.key === nodeType)
  const subtypeEntry = typeEntry?.subtypes?.find((s) => s.key === nodeSubtype)
  const preview = getPreview(nodeType, nodeData, t)

  const sketchStrokeWidth = isCriticalPath || isError || isSelected ? 3 : isPeek ? 1.5 : 2
  const sketchRoughness = isSelected || isCriticalPath ? 2.0 : isPeek ? 0.8 : 1.2
  const sketchFillStyle = layerLocked ? 'hachure' : 'solid' as const
  const sketchStrokeVar = isCriticalPath ? 'critical' : cm.txVar
  const sketchFillVar = layerLocked ? 'muted' : cm.bgVar

  return (
    <SketchyNodeWrapper
      width={360}
      fillColor={sketchFillVar}
      strokeColor={sketchStrokeVar}
      strokeWidth={sketchStrokeWidth}
      roughness={sketchRoughness}
      seed={hashStringToNumber(id)}
      fillStyle={sketchFillStyle}
      className="cursor-pointer"
      pulse={!!data.isError}
    >
      {/* Layer color indicator */}
      {layerColor && (
        <div
          className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
          style={{ backgroundColor: layerColor, zIndex: 2 }}
        />
      )}
      {layerLocked && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-600 text-white text-[9px] font-semibold font-sketch uppercase tracking-wider shadow-sm">
          🔒 {t('layer_locked')}
        </div>
      )}
      {/* Target handles (top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3.5 !h-3.5 !border-2 !bg-card"
        style={{ borderColor: stepColor(cm.txVar) }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in_tl"
        className="!w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor(cm.txVar), left: '20%' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in_tr"
        className="!w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor(cm.txVar), left: '80%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in_sl"
        className="!w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor(cm.txVar), top: '25%' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in_sr"
        className="!w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor(cm.txVar), top: '25%' }}
      />

      <div className="px-5 py-3.5">
        {/* Header: icon + title + duration badge */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl shrink-0">{typeEntry?.icon || '📋'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold font-sketch truncate leading-tight" style={{ color: stepColor(cm.txVar) }}>
              {nodeData.title || t(typeEntry?.labelKey || nodeType)}
            </div>
            <div className="text-sm font-sketch opacity-70 truncate" style={{ color: stepColor(cm.txVar) }}>
              {t(cm.lbKey)}
              {subtypeEntry ? ` · ${t(subtypeEntry.labelKey)}` : ''}
              {' · '}
              {fmtDuration(duration)}
            </div>
          </div>
        </div>

        {/* Preview line */}
        {preview && (
          <div
            className="text-xs font-sketch mt-1.5 truncate opacity-60"
            style={{ color: stepColor(cm.txVar) }}
          >
            {preview}
          </div>
        )}

        {/* IN / OUT flow box — always show for debugging */}
        <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: stepColor(cm.txVar, 0.15) }}>
          <div className="flex items-start gap-1.5 text-[10px]" style={{ color: stepColor(cm.txVar) }}>
            <span className="font-bold opacity-50 shrink-0 w-6">IN</span>
            <span className="opacity-60 truncate">
              {inFlow.length > 0
                ? inFlow.map((f) => `${f.label} ${Math.round(f.grams * 10) / 10}g`).join(' · ')
                : '—'}
            </span>
          </div>
          <div className="flex items-start gap-1.5 text-[10px] mt-0.5" style={{ color: stepColor(cm.txVar) }}>
            <span className="font-bold opacity-50 shrink-0 w-6">OUT</span>
            <span className="opacity-60 truncate">
              {outFlow.length > 0
                ? outFlow.map((f) => `${f.label} ${Math.round(f.grams * 10) / 10}g`).join(' · ')
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Source handles (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3.5 !h-3.5 !border-2 !bg-card"
        style={{ borderColor: stepColor(cm.txVar) }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out_bl"
        className="!w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor(cm.txVar), left: '20%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out_br"
        className="!w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor(cm.txVar), left: '80%' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out_sl"
        className="!w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor(cm.txVar), top: '75%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out_sr"
        className="!w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor(cm.txVar), top: '75%' }}
      />
    </SketchyNodeWrapper>
  )
}

export const BaseNode = memo(BaseNodeInner)
