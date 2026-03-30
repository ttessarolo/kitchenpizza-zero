import { useState, useEffect } from 'react'
import { useRecipeFlowStore, selectGraph, selectPortioning } from '~/stores/recipe-flow-store'
import { computeGraphTotals } from '~/hooks/useGraphCalculator'
import { rnd } from '@commons/utils/format'
import { useT } from '~/hooks/useTranslation'
import { DEFAULT_LOCKS } from '@commons/types/recipe'
import { LockButton } from './LockButton'

export function DoughTotalsPanel() {
  const portioning = useRecipeFlowStore(selectPortioning)
  const graph = useRecipeFlowStore(selectGraph)
  const scaleAllNodes = useRecipeFlowStore((s) => s.scaleAllNodes)
  const toggleLock = useRecipeFlowStore((s) => s.toggleLock)
  const t = useT()

  const locks = portioning.locks ?? DEFAULT_LOCKS
  const totals = computeGraphTotals(graph)
  const hasIngredients = totals.totalDough > 0

  const portioningTarget = portioning.mode === 'tray'
    ? Math.round(portioning.thickness * portioning.tray.l * portioning.tray.w * portioning.tray.count)
    : portioning.ball.weight * portioning.ball.count

  const displayTotal = locks.totalDough && portioning.lockedTotalDough
    ? portioning.lockedTotalDough
    : (hasIngredients ? totals.totalDough : portioningTarget)
  const displayHyd = hasIngredients ? totals.currentHydration : portioning.targetHyd

  // Local state for total input — commit only on blur/Enter to avoid
  // intermediate keystroke values that zero out small ingredients via rnd()
  const [localTotal, setLocalTotal] = useState(String(Math.round(displayTotal)))
  useEffect(() => {
    setLocalTotal(String(Math.round(displayTotal)))
  }, [displayTotal])

  function commitTotal() {
    const v = Math.max(50, +localTotal || 50)
    if (v !== Math.round(displayTotal)) {
      scaleAllNodes(v)
    }
  }

  const hyd = displayHyd / 100
  const { yeastPct, saltPct, fatPct } = portioning
  const divisor = 1 + hyd + yeastPct / 100 + saltPct / 100 + fatPct / 100

  const estFlour = hasIngredients ? totals.totalFlour : Math.round(displayTotal / divisor)
  const estLiquid = hasIngredients ? totals.totalLiquid : Math.round(estFlour * hyd)
  const estYeast = hasIngredients ? Math.round(totals.totalYeast * 10) / 10 : Math.round(estFlour * yeastPct / 100 * 10) / 10
  const estSalt = hasIngredients ? Math.round(totals.totalSalt * 10) / 10 : Math.round(estFlour * saltPct / 100 * 10) / 10
  const estFat = hasIngredients ? Math.round(totals.totalFat * 10) / 10 : Math.round(estFlour * fatPct / 100 * 10) / 10

  return (
    <div className="bg-panel-hover rounded-[7px] p-2.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-medium">{t('label_total_dough')}</span>
        <div className="flex items-center gap-1">
          <LockButton locked={locks.totalDough} onToggle={() => toggleLock('totalDough')} />
          <input
            type="number" value={localTotal} step={10} min={50}
            onChange={(e) => setLocalTotal(e.target.value)}
            onBlur={commitTotal}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            disabled={locks.totalDough}
            className="w-[70px] text-sm font-bold bg-card border-[1.5px] border-border rounded-md px-1.5 py-0.5 outline-none text-center min-h-9 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-muted-foreground">g</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
        <span>{t('label_hydration')}:</span>
        <span className="font-bold text-accent">{displayHyd}%</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">{t('label_flours')}</span><span className="font-bold text-foreground">{rnd(estFlour)}g</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t('label_liquids')}</span><span className="font-bold text-foreground">{rnd(estLiquid)}g</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t('label_yeast')}</span><span className="font-bold text-foreground">{estYeast}g</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t('label_salt')}</span><span className="font-bold text-foreground">{estSalt}g</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t('label_fats')}</span><span className="font-bold text-foreground">{estFat}g</span></div>
      </div>
    </div>
  )
}
