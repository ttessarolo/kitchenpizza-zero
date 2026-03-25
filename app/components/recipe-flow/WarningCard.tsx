import type { ActionableWarning } from '@commons/types/recipe-graph'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'

const SEVERITY_STYLES = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: '🔴',
    btnBg: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: '⚠️',
    btnBg: 'bg-amber-600 hover:bg-amber-700',
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    text: 'text-sky-800',
    icon: '💡',
    btnBg: 'bg-sky-600 hover:bg-sky-700',
  },
}

interface WarningCardProps {
  warning: ActionableWarning
  onDismiss?: () => void
}

export function WarningCard({ warning, onDismiss }: WarningCardProps) {
  const applyWarningAction = useRecipeFlowStore((s) => s.applyWarningAction)
  const style = SEVERITY_STYLES[warning.severity]

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-3 ${style.text}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed">{warning.message}</p>

          {/* Action buttons */}
          {warning.actions && warning.actions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {warning.actions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyWarningAction(warning, i)}
                  className={`text-[10px] font-semibold text-white px-2.5 py-1 rounded-lg ${style.btnBg} transition-colors`}
                >
                  ✓ {action.label}
                </button>
              ))}
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
