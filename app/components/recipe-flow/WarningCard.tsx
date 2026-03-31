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

const VERDICT_STYLES: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
  dismissed: { bg: 'bg-muted', text: 'text-muted-foreground' },
  upgraded: { bg: 'bg-destructive/15', text: 'text-destructive' },
  downgraded: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
}

interface LlmVerdict {
  llmVerdict: string
  llmReason?: string
  suggestedAction?: number
}

interface WarningCardProps {
  warning: ActionableWarning
  count?: number
  appliedAdvisoryIds?: Set<string>
  onDismiss?: () => void
  llmVerdict?: LlmVerdict
}

export function WarningCard({ warning, count, appliedAdvisoryIds, onDismiss, llmVerdict }: WarningCardProps) {
  const t = useT()
  const applyWarningAction = useRecipeFlowStore((s) => s.applyWarningAction)
  const style = SEVERITY_STYLES[warning.severity]
  const alreadyApplied = appliedAdvisoryIds?.has(warning.id) ?? false

  const verdictStyle = llmVerdict ? VERDICT_STYLES[llmVerdict.llmVerdict] ?? VERDICT_STYLES.confirmed : null

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-3 ${style.text}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5">{style.icon}</span>
        {count != null && count > 1 && (
          <span className="text-[10px] font-bold opacity-70 shrink-0 mt-0.5">{t('warning_affected_nodes', { count })}</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs leading-relaxed">{t(warning.messageKey, warning.messageVars)}</p>

            {/* LLM verdict badge */}
            {llmVerdict && verdictStyle && (
              <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${verdictStyle.bg} ${verdictStyle.text}`}>
                {t(`warning_ai_${llmVerdict.llmVerdict}`)}
              </span>
            )}
          </div>

          {/* LLM reason */}
          {llmVerdict?.llmReason && (
            <p className="text-[10px] italic opacity-60 mt-0.5 leading-snug">{llmVerdict.llmReason}</p>
          )}

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
