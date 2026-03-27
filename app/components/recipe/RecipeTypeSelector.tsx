import { RECIPE_TYPES, RECIPE_SUBTYPES } from '@/local_data'
import { Card } from '~/components/ui/card'
import { useT } from '~/hooks/useTranslation'
import type { RecipeMeta } from '@commons/types/recipe'

interface RecipeTypeSelectorProps {
  meta: RecipeMeta
  currentSubtypes: { key: string; label: string }[]
  onTypeChange: (typeKey: string, subtypeKey: string) => void
  onSubtypeChange: (subtypeKey: string) => void
}

export function RecipeTypeSelector({
  meta,
  currentSubtypes,
  onTypeChange,
  onSubtypeChange,
}: RecipeTypeSelectorProps) {
  const t = useT()
  return (
    <section className="mt-3.5">
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[1px]">
              {t('section_type')}
            </label>
            <select
              value={meta.type}
              onChange={(e) => {
                const nk = e.target.value
                const ns = (RECIPE_SUBTYPES[nk] || [])[0]?.key || ''
                onTypeChange(nk, ns)
              }}
              className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-11"
            >
              {RECIPE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[1px]">
              {t('section_subtype')}
            </label>
            <select
              value={meta.subtype}
              onChange={(e) => onSubtypeChange(e.target.value)}
              className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-11"
            >
              {currentSubtypes.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
    </section>
  )
}
