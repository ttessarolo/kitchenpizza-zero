import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { SegmentedToggle } from '~/components/ui/SegmentedToggle'

export function ModeToggle() {
  const t = useT()
  const viewMode = useRecipeFlowStore((s) => s.viewMode)
  const setViewMode = useRecipeFlowStore((s) => s.setViewMode)

  return (
    <SegmentedToggle
      options={[
        { key: 'layer' as const, label: t('mode_layer') },
        { key: 'panoramica' as const, label: t('mode_panoramica') },
      ]}
      value={viewMode}
      onChange={setViewMode}
    />
  )
}
