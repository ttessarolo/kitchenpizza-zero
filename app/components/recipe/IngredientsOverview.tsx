import { Card } from '~/components/ui/card'
import { SectionHeader } from './shared/SectionHeader'
import { IngredientRow } from './shared/IngredientRow'
import { rnd } from '@commons/utils/format'
import { getFlour } from '@commons/utils/flour-manager'
import { FLOUR_CATALOG, YEAST_TYPES } from '@/local_data'
import { FAT_TYPES } from '@/local_data/fat-catalog'
import { useT } from '~/hooks/useTranslation'
import type { GroupedIngredients } from '~/hooks/useRecipeCalculator'
import type { FlourCatalogEntry } from '@commons/types/recipe'

interface IngredientsOverviewProps {
  ingredientGroups: string[]
  groupedIngredients: Record<string, GroupedIngredients>
  hideHeader?: boolean
}

export function IngredientsOverview({
  ingredientGroups,
  groupedIngredients,
  hideHeader,
}: IngredientsOverviewProps) {
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
              <IngredientRow
                key={'f' + f.type}
                name={t(getFlour(f.type, FLOUR_CATALOG as unknown as FlourCatalogEntry[]).labelKey)}
                amount={rnd(f.g)}
                unit="g"
              />
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
