import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { COLOR_MAP } from '@/local_data'
import { fmtDuration } from '@commons/utils/format'
import { useT } from '~/hooks/useTranslation'
import { stepColor } from '~/lib/theme-colors'
import { SketchyNodeWrapper, hashStringToNumber } from '~/components/recipe-flow/sketchy'
import type { BaseNodeData } from './BaseNode'

function SplitNodeInner({ id, data }: NodeProps<Node<BaseNodeData>>) {
  const t = useT()
  const { nodeData, duration, inFlow, outFlow } = data
  const cm = COLOR_MAP.split
  const outputs = nodeData.splitOutputs || []

  const actualOutputs = outputs.length > 0 ? outputs : [
    { handle: 'out_0', label: t("label_part_n", { n: 1 }), value: 50 },
    { handle: 'out_1', label: t("label_part_n", { n: 2 }), value: 50 },
  ]

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
        <div className="flex items-center gap-2.5">
          <span className="text-2xl shrink-0">✂️</span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold font-sketch truncate leading-tight" style={{ color: stepColor(cm.txVar) }}>
              {nodeData.title || t("label_split_default")}
            </div>
            <div className="text-sm font-sketch opacity-70" style={{ color: stepColor(cm.txVar) }}>
              {t(cm.lbKey)} · {fmtDuration(duration)}
            </div>
          </div>
        </div>

        {/* Split outputs — read-only display (edit in config panel) */}
        <div className="mt-2 space-y-0.5">
          {actualOutputs.map((o) => (
            <div key={o.handle} className="flex items-center justify-between text-xs font-sketch" style={{ color: stepColor(cm.txVar) }}>
              <span className="font-medium truncate">{o.label}</span>
              <span className="font-bold shrink-0 ml-2">
                {o.value}{nodeData.splitMode === 'pct' ? '%' : 'g'}
              </span>
            </div>
          ))}
        </div>

        {/* IN / OUT flow */}
        <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: stepColor(cm.txVar, 0.15) }}>
          <div className="flex items-start gap-1.5 text-[10px]" style={{ color: stepColor(cm.txVar) }}>
            <span className="font-bold opacity-50 shrink-0 w-6">IN</span>
            <span className="opacity-60 truncate">
              {(inFlow ?? []).length > 0
                ? (inFlow ?? []).map((f) => `${f.label} ${Math.round(f.grams * 10) / 10}g`).join(' · ')
                : '—'}
            </span>
          </div>
          <div className="flex items-start gap-1.5 text-[10px] mt-0.5" style={{ color: stepColor(cm.txVar) }}>
            <span className="font-bold opacity-50 shrink-0 w-6">OUT</span>
            <span className="opacity-60 truncate">
              {(outFlow ?? []).length > 0
                ? (outFlow ?? []).map((f) => `${f.label} ${Math.round(f.grams * 10) / 10}g`).join(' · ')
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Output side handles */}
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

      {/* Dynamic source handles with label badges below */}
      {actualOutputs.map((o, i, arr) => {
        const leftPct = ((i + 1) * 100) / (arr.length + 1)
        return (
          <div key={o.handle}>
            <Handle
              type="source"
              position={Position.Bottom}
              id={o.handle}
              className="!w-3.5 !h-3.5 !border-2 !bg-card"
              style={{ borderColor: stepColor(cm.txVar), left: `${leftPct}%` }}
            />
            <div
              className="absolute text-[9px] font-bold font-sketch px-1.5 py-0.5 rounded-full pointer-events-none whitespace-nowrap"
              style={{
                left: `${leftPct}%`,
                bottom: -22,
                transform: 'translateX(-50%)',
                backgroundColor: stepColor(cm.txVar, 0.09),
                color: stepColor(cm.txVar),
              }}
            >
              {o.label}: {o.value}{nodeData.splitMode === 'pct' ? '%' : 'g'}
            </div>
          </div>
        )
      })}
    </SketchyNodeWrapper>
  )
}

export const SplitNode = memo(SplitNodeInner)
