import { useT } from '~/hooks/useTranslation'
import { LAYER_SUBTYPES, getVariants, getDefaultVariant } from '@commons/constants/layer-subtypes'
import { Card } from '~/components/ui/card'
import type { LayerType } from '@commons/types/recipe-layers'

interface LayerSubtypeSelectorProps {
  layerType: LayerType
  currentSubtype: string
  currentVariant: string
  onSubtypeChange: (subtype: string, variant: string) => void
  onVariantChange: (variant: string) => void
}

export function LayerSubtypeSelector({
  layerType,
  currentSubtype,
  currentVariant,
  onSubtypeChange,
  onVariantChange,
}: LayerSubtypeSelectorProps) {
  const t = useT()
  const subtypes = LAYER_SUBTYPES[layerType]
  const variants = getVariants(layerType, currentSubtype)

  return (
    <section className="mb-3">
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[1px]">
              {t('select_subtype')}
            </label>
            <select
              value={currentSubtype}
              onChange={(e) => {
                const newSubtype = e.target.value
                const newVariant = getDefaultVariant(layerType, newSubtype)
                onSubtypeChange(newSubtype, newVariant)
              }}
              className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-11"
            >
              {subtypes.map((s) => (
                <option key={s.key} value={s.key}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[1px]">
              {t('section_variant')}
            </label>
            <select
              value={currentVariant}
              onChange={(e) => onVariantChange(e.target.value)}
              className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-11"
            >
              {variants.map((v) => (
                <option key={v.key} value={v.key}>
                  {t(v.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
    </section>
  )
}
