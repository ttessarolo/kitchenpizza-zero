import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { fmtDuration } from '@commons/utils/format'
import { useRecipeFlowStore, selectGraph, selectPortioning } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'
import { computeSchedule } from '~/hooks/useGraphCalculator'
import { stepColor } from '~/lib/theme-colors'
import { SketchyNodeWrapper, hashStringToNumber } from '~/components/recipe-flow/sketchy'
import type { BaseNodeData } from './BaseNode'

function DoneNodeInner({ id, data }: NodeProps<Node<BaseNodeData>>) {
  const t = useT()
  const graph = useRecipeFlowStore(selectGraph)
  const meta = useRecipeFlowStore((s) => s.meta)
  const portioning = useRecipeFlowStore(selectPortioning)

  const { span } = computeSchedule(graph, meta.type, meta.subtype, portioning.thickness)

  return (
    <SketchyNodeWrapper
      width={360}
      fillColor="step-done-bg"
      strokeColor="step-done-tx"
      strokeWidth={2}
      roughness={1.2}
      seed={hashStringToNumber(id)}
      fillStyle="solid"
      className="cursor-pointer"
    >
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3.5 !h-3.5 !border-2 !bg-card"
        style={{ borderColor: stepColor('step-done-tx') }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in_tl"
        className="handle-secondary !w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor('step-done-tx'), left: '20%' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in_tr"
        className="handle-secondary !w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor('step-done-tx'), left: '80%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in_sl"
        className="handle-secondary !w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor('step-done-tx'), top: '25%' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in_sr"
        className="handle-secondary !w-2 !h-2 !border !bg-card/60"
        style={{ borderColor: stepColor('step-done-tx'), top: '25%' }}
      />
      <div className="py-5 text-center">
        <div className="text-3xl">🎉</div>
        <div className="text-lg font-bold font-sketch mt-1" style={{ color: stepColor('step-done-tx') }}>
          {data.nodeData.title || t('label_done_ready')}
        </div>
        {span > 0 && (
          <div className="text-sm font-sketch opacity-70 mt-0.5" style={{ color: stepColor('step-done-tx') }}>
            {t('label_total_time')}: {fmtDuration(span)}
          </div>
        )}
      </div>
    </SketchyNodeWrapper>
  )
}

export const DoneNode = memo(DoneNodeInner)
