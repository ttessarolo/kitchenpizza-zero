import { memo } from 'react'
import { Handle, Position, useEdges, type NodeProps } from '@xyflow/react'
import { COLOR_MAP } from '@/local_data'
import { fmtDuration } from '@commons/utils/format'
import { useT } from '~/hooks/useTranslation'
import type { BaseNodeData } from './BaseNode'

function JoinNodeInner({ id, data }: NodeProps<BaseNodeData>) {
  const t = useT()
  const { nodeData, duration } = data
  const cm = COLOR_MAP.join
  const edges = useEdges()
  const incomingCount = edges.filter((e) => e.target === id).length

  return (
    <div
      className="rounded-2xl border-2 shadow-sm w-[360px] cursor-pointer transition-shadow hover:shadow-md"
      style={{ borderColor: cm.tx + '40', backgroundColor: cm.bg }}
    >
      {/* Dynamic target handles */}
      {Array.from({ length: Math.max(incomingCount, 1) }, (_, i) => (
        <Handle
          key={`in_${i}`}
          type="target"
          position={Position.Top}
          id={`in_${i}`}
          className="!w-3.5 !h-3.5 !border-2 !bg-white"
          style={{
            borderColor: cm.tx,
            left: `${((i + 1) * 100) / (Math.max(incomingCount, 1) + 1)}%`,
          }}
        />
      ))}

      <div className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl shrink-0">🔗</span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate leading-tight" style={{ color: cm.tx }}>
              {nodeData.title || 'Mix'}
            </div>
            <div className="text-sm opacity-70" style={{ color: cm.tx }}>
              {nodeData.joinMethod ? t(`join_${nodeData.joinMethod}`) : cm.lb}
              {' · '}{fmtDuration(duration)}
            </div>
          </div>
        </div>
      </div>

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

export const JoinNode = memo(JoinNodeInner)
