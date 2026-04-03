import { useState, useEffect } from 'react'
import { Card } from '~/components/ui/card'
import { SectionHeader } from './shared/SectionHeader'
import { IngredientRow } from './shared/IngredientRow'
import { rnd } from '@commons/utils/format'
import { getFlourRPC } from '~/lib/recipe-rpc'
import { useFlourCatalog, useYeastTypes, useFatTypes } from '~/hooks/useScienceCatalogs'
import { useT } from '~/hooks/useTranslation'
import type { GroupedIngredients } from '~/hooks/useRecipeCalculator'
import type { FlourCatalogEntry } from '@commons/types/recipe'

// Module-level flour label cache shared with PanoramicaSummaryPanel
const flourLabelCache = new Map<string, string>()

function useFlourLabel(type: string): string {
  const { flours: FLOUR_CATALOG } = useFlourCatalog()
  const t = useT()
  // Try local catalog first (sync)
  const catalogEntry = (FLOUR_CATALOG as unknown as FlourCatalogEntry[]).find((f) => f.key === type)
  const [labelKey, setLabelKey] = useState<string>(
    catalogEntry?.labelKey ?? flourLabelCache.get(type) ?? `flour_${type}`,
  )

  useEffect(() => {
    if (catalogEntry) {
      flourLabelCache.set(type, catalogEntry.labelKey)
      return
    }
    if (flourLabelCache.has(type)) {
      setLabelKey(flourLabelCache.get(type)!)
      return
    }
    let cancelled = false
    getFlourRPC(type)
      .then((f) => {
        if (!cancelled && f) {
          flourLabelCache.set(type, f.labelKey)
          setLabelKey(f.labelKey)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [type, catalogEntry])

  return t(labelKey)
}

interface IngredientsOverviewProps {
  ingredientGroups: string[]
  groupedIngredients: Record<string, GroupedIngredients>
  hideHeader?: boolean
}

function FlourIngredientRow({ type, g }: { type: string; g: number }) {
  const name = useFlourLabel(type)
  return <IngredientRow name={name} amount={rnd(g)} unit="g" />
}

export function IngredientsOverview({
  ingredientGroups,
  groupedIngredients,
  hideHeader,
}: IngredientsOverviewProps) {
  const YEAST_TYPES = useYeastTypes()
  const FAT_TYPES = useFatTypes()
  const t = useT()
  return (
    <section className={hideHeader ? '' : 'mt-3.5'}>
      {!hideHeader && <SectionHeader emoji="🧈" title="Ingredienti" />}
      {ingredientGroups.map((g) => {
        const grp = groupedIngredients[g]
        if (
          !grp ||
          grp.flours.length + grp.liquids.length + grp.extras.length + grp.yeasts.length + (grp.salts?.length ?? 0) + (grp.sugars?.length ?? 0) + (grp.fats?.length ?? 0) === 0
        )
          return null
        return (
          <Card key={g} className="p-3 mb-1.5">
            <h3 className="text-[9px] uppercase tracking-[1.5px] text-accent mb-1.5 font-semibold">
              {g}
            </h3>
            {grp.flours.map((f) => (
              <FlourIngredientRow key={'f' + f.type} type={f.type} g={f.g} />
            ))}
            {grp.liquids.map((l) => (
              <IngredientRow key={'l' + l.type} name={l.type} amount={rnd(l.g)} unit="g" />
            ))}
            {grp.yeasts.map((y) => (
              <IngredientRow
                key={'y' + y.type}
                name={t(YEAST_TYPES.find((yt) => yt.key === y.type)?.labelKey || 'yeast_fresh')}
                amount={rnd(y.g)}
                unit="g"
              />
            ))}
            {grp.extras.map((e) => (
              <IngredientRow
                key={'e' + e.name}
                name={e.name}
                amount={e.unit ? e.g : rnd(e.g)}
                unit={e.unit || 'g'}
              />
            ))}
            {(grp.salts ?? []).map((s) => (
              <IngredientRow key={'s' + s.type} name={s.type === 'sale_fino' ? 'Sale fino' : s.type === 'sale_grosso' ? 'Sale grosso' : s.type} amount={rnd(s.g)} unit="g" />
            ))}
            {(grp.sugars ?? []).map((s) => (
              <IngredientRow key={'su' + s.type} name={s.type === 'zucchero' ? 'Zucchero' : s.type === 'miele' ? 'Miele' : s.type} amount={rnd(s.g)} unit="g" />
            ))}
            {(grp.fats ?? []).map((f) => (
              <IngredientRow
                key={'fat' + f.type}
                name={t(FAT_TYPES.find((ft) => ft.key === f.type)?.labelKey ?? f.type)}
                amount={rnd(f.g)}
                unit="g"
              />
            ))}
          </Card>
        )
      })}
    </section>
  )
}
