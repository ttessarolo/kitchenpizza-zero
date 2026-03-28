import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { getParentIds } from '@commons/utils/graph-utils'
import type { SplitOutput } from '@commons/types/recipe-graph'

interface SplitConfigPanelProps {
  nodeId: string
}

export function SplitConfigPanel({ nodeId }: SplitConfigPanelProps) {
  const t = useT()
  const graph = useRecipeFlowStore((s) => s.graph)
  const updateNodeData = useRecipeFlowStore((s) => s.updateNodeData)

  const node = graph.nodes.find((n) => n.id === nodeId)
  if (!node || node.type !== 'split') return null

  const d = node.data
  const outputs = d.splitOutputs || []
  const mode = d.splitMode || 'pct'

  // Estimate incoming weight (from parent nodes)
  const parentIds = getParentIds(nodeId, graph.edges)
  // Simple estimate: sum of parent weights (for display)
  let incomingWeight = 0
  for (const pid of parentIds) {
    const pn = graph.nodes.find((n) => n.id === pid)
    if (pn) {
      incomingWeight += pn.data.flours.reduce((a, f) => a + f.g, 0)
        + pn.data.liquids.reduce((a, l) => a + l.g, 0)
        + pn.data.extras.reduce((a, e) => a + e.g, 0)
        + (pn.data.yeasts ?? []).reduce((a, y) => a + y.g, 0)
        + (pn.data.salts ?? []).reduce((a, s) => a + s.g, 0)
        + (pn.data.sugars ?? []).reduce((a, s) => a + s.g, 0)
        + (pn.data.fats ?? []).reduce((a, f) => a + f.g, 0)
    }
  }

  function updateOutputs(newOutputs: SplitOutput[]) {
    updateNodeData(nodeId, { splitOutputs: newOutputs })
  }

  function addOutput() {
    const idx = outputs.length
    const remaining = mode === 'pct'
      ? Math.max(0, 100 - outputs.reduce((a, o) => a + o.value, 0))
      : 0
    updateOutputs([
      ...outputs,
      { handle: `out_${idx}`, label: t("label_part_n", { n: idx + 1 }), value: remaining || (mode === 'pct' ? 0 : 100) },
    ])
  }

  function removeOutput(idx: number) {
    if (outputs.length <= 2) return // min 2
    updateOutputs(outputs.filter((_, i) => i !== idx).map((o, i) => ({ ...o, handle: `out_${i}` })))
  }

  function updateOutput(idx: number, patch: Partial<SplitOutput>) {
    updateOutputs(outputs.map((o, i) => (i === idx ? { ...o, ...patch } : o)))
  }

  const totalPct = outputs.reduce((a, o) => a + o.value, 0)
  const pctError = mode === 'pct' && Math.abs(totalPct - 100) > 0.01

  return (
    <div className="mt-2 space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('label_mode')}</span>
        <div className="flex rounded-md overflow-hidden border border-border text-[11px]">
          <button
            type="button"
            onClick={() => updateNodeData(nodeId, { splitMode: 'pct' })}
            className={`px-2.5 py-1 ${mode === 'pct' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-white text-muted-foreground'}`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => updateNodeData(nodeId, { splitMode: 'grams' })}
            className={`px-2.5 py-1 ${mode === 'grams' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-white text-muted-foreground'}`}
          >
            {t('label_grams')}
          </button>
        </div>
      </div>

      {/* Outputs */}
      {outputs.map((o, i) => {
        const pct = mode === 'pct' ? o.value : (incomingWeight > 0 ? Math.round((o.value / incomingWeight) * 100) : 0)
        const grams = mode === 'grams' ? o.value : (incomingWeight > 0 ? Math.round(incomingWeight * o.value / 100) : 0)

        return (
          <div key={o.handle} className="flex items-center gap-1.5 bg-[#faf8f5] rounded-lg p-2">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={o.label}
                onChange={(e) => updateOutput(i, { label: e.target.value })}
                placeholder={t("label_part_n", { n: i + 1 })}
                className="w-full text-xs font-medium bg-transparent border-b border-dashed border-border outline-none pb-0.5 mb-1"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={o.value}
                  min={0}
                  max={mode === 'pct' ? 100 : undefined}
                  step={mode === 'pct' ? 5 : 10}
                  onChange={(e) => updateOutput(i, { value: +e.target.value || 0 })}
                  className="w-16 text-xs font-bold bg-white border border-border rounded px-1.5 py-0.5 outline-none text-center"
                />
                <span className="text-[10px] text-muted-foreground">
                  {mode === 'pct' ? '%' : 'g'}
                </span>
                {/* Always show the other unit */}
                <span className="text-[10px] text-muted-foreground opacity-60">
                  ({mode === 'pct' ? `${grams}g` : `${pct}%`})
                </span>
              </div>
            </div>
            {outputs.length > 2 && (
              <button
                type="button"
                onClick={() => removeOutput(i)}
                className="w-6 h-6 rounded text-xs text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        )
      })}

      {/* Totals + error */}
      {pctError && (
        <div className="text-[10px] text-amber-600 font-medium">
          {t('validation_pct_sum', { total: Math.round(totalPct) })}
        </div>
      )}

      {/* Add output button */}
      <button
        type="button"
        onClick={addOutput}
        className="w-full text-[11px] font-medium text-primary border border-dashed border-primary rounded-lg py-1.5 hover:bg-primary/5"
      >
        {t('btn_add_part')}
      </button>
    </div>
  )
}
