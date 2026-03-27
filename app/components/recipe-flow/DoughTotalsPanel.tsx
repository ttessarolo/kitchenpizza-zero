import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { computeGraphTotals } from '~/hooks/useGraphCalculator'
import { rnd } from '@commons/utils/format'
import { useT } from '~/hooks/useTranslation'

export function DoughTotalsPanel() {
  const portioning = useRecipeFlowStore((s) => s.portioning)
  const graph = useRecipeFlowStore((s) => s.graph)
  const scaleAllNodes = useRecipeFlowStore((s) => s.scaleAllNodes)
  const setGlobalHydration = useRecipeFlowStore((s) => s.setGlobalHydration)
  const t = useT()

  const totals = computeGraphTotals(graph)
  const hasIngredients = totals.totalDough > 0

  const portioningTarget = portioning.mode === 'tray'
    ? Math.round(portioning.thickness * portioning.tray.l * portioning.tray.w * portioning.tray.count)
    : portioning.ball.weight * portioning.ball.count

  const displayTotal = hasIngredients ? totals.totalDough : portioningTarget
  const displayHyd = hasIngredients ? totals.currentHydration : portioning.targetHyd

  const hyd = displayHyd / 100
  const { yeastPct, saltPct, fatPct } = portioning
  const divisor = 1 + hyd + yeastPct / 100 + saltPct / 100 + fatPct / 100

  const estFlour = hasIngredients ? totals.totalFlour : Math.round(displayTotal / divisor)
  const estLiquid = hasIngredients ? totals.totalLiquid : Math.round(estFlour * hyd)
  const estYeast = hasIngredients ? Math.round(totals.totalYeast * 10) / 10 : Math.round(estFlour * yeastPct / 100 * 10) / 10
  const estSalt = hasIngredients ? Math.round(totals.totalSalt * 10) / 10 : Math.round(estFlour * saltPct / 100 * 10) / 10
  const estFat = hasIngredients ? Math.round(totals.totalFat * 10) / 10 : Math.round(estFlour * fatPct / 100 * 10) / 10

  return (
    <div className="bg-gradient-to-br from-[#f9f3ec] to-[#f5ede3] rounded-[7px] p-2.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-medium">{t('label_total_dough')}</span>
        <div className="flex items-center gap-1">
          <input type="number" value={Math.round(displayTotal)} step={10} min={50} onChange={(e) => scaleAllNodes(+e.target.value || 50)} className="w-[70px] text-sm font-bold bg-white border-[1.5px] border-border rounded-md px-1.5 py-0.5 outline-none text-center min-h-9" />
          <span className="text-muted-foreground">g</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
        <span>{t('label_hydration')}:</span>
        <input type="number" value={displayHyd} step={1} onChange={(e) => setGlobalHydration(+e.target.value || 0)} className="w-[50px] text-xs font-bold text-accent bg-white border border-border rounded px-1.5 py-px outline-none text-center min-h-7" />
        <span>%</span>
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
