import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { fmtDuration } from '@commons/utils/recipe'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { computeSchedule } from '~/hooks/useGraphCalculator'
import type { BaseNodeData } from './BaseNode'

function DoneNodeInner({ id, data }: NodeProps<BaseNodeData>) {
  const graph = useRecipeFlowStore((s) => s.graph)
  const meta = useRecipeFlowStore((s) => s.meta)
  const portioning = useRecipeFlowStore((s) => s.portioning)

  const { span } = computeSchedule(graph, meta.type, meta.subtype, portioning.thickness)

  return (
    <div className="rounded-2xl border-2 border-[#5aaa5a30] bg-gradient-to-br from-[#eaf5ea] to-[#d8f0d8] w-[360px] py-5 text-center">
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3.5 !h-3.5 !border-2 !bg-white !border-[#5aaa5a]"
      />
      <div className="text-3xl">🎉</div>
      <div className="text-lg font-bold text-[#3a7a3a] mt-1">
        {data.nodeData.title || 'Pronto!'}
      </div>
      {span > 0 && (
        <div className="text-sm text-[#5a9a5a] mt-0.5">
          Tempo totale: {fmtDuration(span)}
        </div>
      )}
    </div>
  )
}

export const DoneNode = memo(DoneNodeInner)
