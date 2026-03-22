import { Card } from '~/components/ui/card'
import { SectionHeader } from './shared/SectionHeader'
import { IngredientRow } from './shared/IngredientRow'
import { rnd, getFlour } from '@commons/utils/recipe'
import { FLOUR_CATALOG, YEAST_TYPES } from '@/local_data'
import type { GroupedIngredients } from '~/hooks/useRecipeCalculator'
import type { FlourCatalogEntry } from '@commons/types/recipe'

interface IngredientsOverviewProps {
  ingredientGroups: string[]
  groupedIngredients: Record<string, GroupedIngredients>
}

export function IngredientsOverview({
  ingredientGroups,
  groupedIngredients,
}: IngredientsOverviewProps) {
  return (
    <section className="mt-3.5">
      <SectionHeader emoji="🧈" title="Ingredienti" />
      {ingredientGroups.map((g) => {
        const grp = groupedIngredients[g]
        if (
          !grp ||
          grp.flours.length + grp.liquids.length + grp.extras.length + grp.yeasts.length === 0
        )
          return null
        return (
          <Card key={g} className="p-3 mb-1.5">
            <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#b8845a] mb-1.5 font-semibold">
              {g}
            </h3>
            {grp.flours.map((f) => (
              <IngredientRow
                key={'f' + f.type}
                name={getFlour(f.type, FLOUR_CATALOG as unknown as FlourCatalogEntry[]).label}
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
                name={YEAST_TYPES.find((t) => t.key === y.type)?.label || 'Lievito'}
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
          </Card>
        )
      })}
    </section>
  )
}
