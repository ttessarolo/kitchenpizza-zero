import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { COLOR_MAP } from '@/local_data'
import { fmtDuration } from '@commons/utils/format'
import type { BaseNodeData } from './BaseNode'

function SplitNodeInner({ id, data }: NodeProps<BaseNodeData>) {
  const { nodeData, duration, inFlow, outFlow } = data
  const cm = COLOR_MAP.split
  const outputs = nodeData.splitOutputs || []

  const actualOutputs = outputs.length > 0 ? outputs : [
    { handle: 'out_0', label: 'Parte 1', value: 50 },
    { handle: 'out_1', label: 'Parte 2', value: 50 },
  ]

  return (
    <div
      className="rounded-2xl border-2 shadow-sm w-[360px] cursor-pointer transition-shadow hover:shadow-md"
      style={{ borderColor: cm.tx + '40', backgroundColor: cm.bg }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3.5 !h-3.5 !border-2 !bg-white"
        style={{ borderColor: cm.tx }}
      />

      <div className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl shrink-0">✂️</span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate leading-tight" style={{ color: cm.tx }}>
              {nodeData.title || 'Divisione'}
            </div>
            <div className="text-sm opacity-70" style={{ color: cm.tx }}>
              {cm.lb} · {fmtDuration(duration)}
            </div>
          </div>
        </div>

        {/* Split outputs — read-only display (edit in config panel) */}
        <div className="mt-2 space-y-0.5">
          {actualOutputs.map((o) => (
            <div key={o.handle} className="flex items-center justify-between text-xs" style={{ color: cm.tx }}>
              <span className="font-medium truncate">{o.label}</span>
              <span className="font-bold shrink-0 ml-2">
                {o.value}{nodeData.splitMode === 'pct' ? '%' : 'g'}
              </span>
            </div>
          ))}
        </div>

        {/* IN / OUT flow */}
        <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: cm.tx + '25' }}>
          <div className="flex items-start gap-1.5 text-[10px]" style={{ color: cm.tx }}>
            <span className="font-bold opacity-50 shrink-0 w-6">IN</span>
            <span className="opacity-60 truncate">
              {(inFlow ?? []).length > 0
                ? (inFlow ?? []).map((f) => `${f.label} ${Math.round(f.grams * 10) / 10}g`).join(' · ')
                : '—'}
            </span>
          </div>
          <div className="flex items-start gap-1.5 text-[10px] mt-0.5" style={{ color: cm.tx }}>
            <span className="font-bold opacity-50 shrink-0 w-6">OUT</span>
            <span className="opacity-60 truncate">
              {(outFlow ?? []).length > 0
                ? (outFlow ?? []).map((f) => `${f.label} ${Math.round(f.grams * 10) / 10}g`).join(' · ')
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic source handles with label badges below */}
      {actualOutputs.map((o, i, arr) => {
        const leftPct = ((i + 1) * 100) / (arr.length + 1)
        return (
          <div key={o.handle}>
            <Handle
              type="source"
              position={Position.Bottom}
              id={o.handle}
              className="!w-3.5 !h-3.5 !border-2 !bg-white"
              style={{ borderColor: cm.tx, left: `${leftPct}%` }}
            />
            <div
              className="absolute text-[9px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none whitespace-nowrap"
              style={{
                left: `${leftPct}%`,
                bottom: -22,
                transform: 'translateX(-50%)',
                backgroundColor: cm.tx + '18',
                color: cm.tx,
              }}
            >
              {o.label}: {o.value}{nodeData.splitMode === 'pct' ? '%' : 'g'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const SplitNode = memo(SplitNodeInner)
