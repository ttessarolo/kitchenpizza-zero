import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'

export function ModeToggle() {
  const t = useT()
  const viewMode = useRecipeFlowStore((s) => s.viewMode)
  const setViewMode = useRecipeFlowStore((s) => s.setViewMode)

  return (
    <div className="flex rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setViewMode('layer')}
        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
          viewMode === 'layer'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('mode_layer')}
      </button>
      <button
        type="button"
        onClick={() => setViewMode('panoramica')}
        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
          viewMode === 'panoramica'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('mode_panoramica')}
      </button>
    </div>
  )
}
