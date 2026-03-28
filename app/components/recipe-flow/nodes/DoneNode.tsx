import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { fmtDuration } from '@commons/utils/format'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'
import { computeSchedule } from '~/hooks/useGraphCalculator'
import type { BaseNodeData } from './BaseNode'

function DoneNodeInner({ data }: NodeProps<Node<BaseNodeData>>) {
  const t = useT()
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
        {data.nodeData.title || t('label_done_ready')}
      </div>
      {span > 0 && (
        <div className="text-sm text-[#5a9a5a] mt-0.5">
          {t('label_total_time')}: {fmtDuration(span)}
        </div>
      )}
    </div>
  )
}

export const DoneNode = memo(DoneNodeInner)
