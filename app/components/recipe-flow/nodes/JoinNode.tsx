import { memo } from 'react'
import { Handle, Position, useEdges, type NodeProps, type Node } from '@xyflow/react'
import { COLOR_MAP } from '@/local_data'
import { fmtDuration } from '@commons/utils/format'
import { useT } from '~/hooks/useTranslation'
import { stepColor } from '~/lib/theme-colors'
import { SketchyNodeWrapper, hashStringToNumber } from '~/components/recipe-flow/sketchy'
import type { BaseNodeData } from './BaseNode'

function JoinNodeInner({ id, data }: NodeProps<Node<BaseNodeData>>) {
  const t = useT()
  const { nodeData, duration } = data
  const cm = COLOR_MAP.join
  const edges = useEdges()
  const incomingCount = edges.filter((e) => e.target === id).length

  return (
    <SketchyNodeWrapper
      width={360}
      fillColor={cm.bgVar}
      strokeColor={cm.txVar}
      strokeWidth={2}
      roughness={1.2}
      seed={hashStringToNumber(id)}
      fillStyle="solid"
      className="cursor-pointer"
    >
      {/* Input side handles */}
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

      {/* Dynamic target handles */}
      {Array.from({ length: Math.max(incomingCount, 1) }, (_, i) => (
        <Handle
          key={`in_${i}`}
          type="target"
          position={Position.Top}
          id={`in_${i}`}
          className="!w-3.5 !h-3.5 !border-2 !bg-card"
          style={{
            borderColor: stepColor(cm.txVar),
            left: `${((i + 1) * 100) / (Math.max(incomingCount, 1) + 1)}%`,
          }}
        />
      ))}

      <div className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl shrink-0">🔗</span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold font-sketch truncate leading-tight" style={{ color: stepColor(cm.txVar) }}>
              {nodeData.title || 'Mix'}
            </div>
            <div className="text-sm font-sketch opacity-70" style={{ color: stepColor(cm.txVar) }}>
              {nodeData.joinMethod ? t(`join_${nodeData.joinMethod}`) : t(cm.lbKey)}
              {' · '}{fmtDuration(duration)}
            </div>
          </div>
        </div>
      </div>

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

export const JoinNode = memo(JoinNodeInner)
