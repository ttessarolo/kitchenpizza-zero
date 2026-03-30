import type { ActionableWarning } from '@commons/types/recipe-graph'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'

const SEVERITY_STYLES = {
  error: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    text: 'text-destructive',
    icon: '🔴',
    btnBg: 'bg-destructive hover:bg-destructive/90',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    text: 'text-warning',
    icon: '⚠️',
    btnBg: 'bg-warning hover:bg-warning/80',
  },
  info: {
    bg: 'bg-info/10',
    border: 'border-info/30',
    text: 'text-info',
    icon: '💡',
    btnBg: 'bg-info hover:bg-info/80',
  },
}

interface WarningCardProps {
  warning: ActionableWarning
  count?: number
  appliedAdvisoryIds?: Set<string>
  onDismiss?: () => void
}

export function WarningCard({ warning, count, appliedAdvisoryIds, onDismiss }: WarningCardProps) {
  const t = useT()
  const applyWarningAction = useRecipeFlowStore((s) => s.applyWarningAction)
  const style = SEVERITY_STYLES[warning.severity]
  const alreadyApplied = appliedAdvisoryIds?.has(warning.id) ?? false

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-3 ${style.text}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5">{style.icon}</span>
        {count != null && count > 1 && (
          <span className="text-[10px] font-bold opacity-70 shrink-0 mt-0.5">{t('warning_affected_nodes', { count })}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed">{t(warning.messageKey, warning.messageVars)}</p>

          {/* Action buttons */}
          {warning.actions && warning.actions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {warning.actions.map((action, i) => {
                const hasAddNode = action.mutations.some((m) => m.type === 'addNodeAfter')
                if (hasAddNode && alreadyApplied) {
                  return (
                    <span key={i} className="mt-1.5 inline-block text-[10px] font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-muted">
                      ✓ {t('warning_already_added')}
                    </span>
                  )
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyWarningAction(warning, i)}
                    className={`text-[10px] font-semibold text-white px-2.5 py-1 rounded-lg ${style.btnBg} transition-colors`}
                  >
                    ✓ {t(action.labelKey, warning.messageVars)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] opacity-40 hover:opacity-70 shrink-0"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
