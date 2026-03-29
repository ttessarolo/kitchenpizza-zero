import type { DedupedWarning } from '@commons/types/recipe-graph'
import { WarningCard } from './WarningCard'
import { useT } from '~/hooks/useTranslation'

interface ActionableWarningBoxProps {
  warnings: DedupedWarning[]
  onApplyAll: () => void
}

export function ActionableWarningBox({ warnings, onApplyAll }: ActionableWarningBoxProps) {
  const t = useT()

  if (warnings.length === 0) return null

  return (
    <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
          {t('warning_actionable_title')}
        </span>
        <button
          type="button"
          onClick={onApplyAll}
          className="text-[10px] font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded-lg transition-colors"
        >
          {t('btn_apply_all')}
        </button>
      </div>

      <div className="space-y-1.5">
        {warnings.map((w) => (
          <WarningCard key={w.id} warning={w} count={w.count} />
        ))}
      </div>
    </div>
  )
}
