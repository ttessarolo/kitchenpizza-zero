import type { DedupedWarning } from '@commons/types/recipe-graph'
import { Loader2 } from 'lucide-react'
import { WarningCard } from './WarningCard'
import { useT } from '~/hooks/useTranslation'

interface ActionableWarningBoxProps {
  warnings: DedupedWarning[]
  onApplyAll: () => void
  isApplying?: boolean
}

export function ActionableWarningBox({ warnings, onApplyAll, isApplying }: ActionableWarningBoxProps) {
  const t = useT()

  if (warnings.length === 0) return null

  return (
    <div className="border border-warning/30 bg-warning/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-warning">
          {t('warning_actionable_title')}
        </span>
        <button
          type="button"
          onClick={onApplyAll}
          disabled={isApplying}
          className="text-[10px] font-semibold text-white bg-warning hover:bg-warning/80 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
        >
          {isApplying && <Loader2 className="w-3 h-3 animate-spin" />}
          {isApplying ? t('btn_applying') : t('btn_apply_all')}
        </button>
      </div>

      {isApplying ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-warning animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t('applying_fixes')}</span>
        </div>
      ) : (
        <>
          <div className="border-t border-warning/30" />
          <div className="space-y-1.5">
            {warnings.map((w) => (
              <WarningCard key={w.id} warning={w} count={w.count} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
