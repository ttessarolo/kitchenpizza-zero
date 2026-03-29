import {
  Wheat,
  Droplet,
  Utensils,
  FlaskConical,
  CakeSlice,
} from 'lucide-react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { LAYER_TYPES, LAYER_TYPE_META } from '@commons/constants/layer-defaults'
import type { LayerType } from '@commons/types/recipe-layers'

// ── Icon mapping ────────────────────────────────────────────────

const LAYER_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wheat: Wheat,
  droplet: Droplet,
  utensils: Utensils,
  'flask-conical': FlaskConical,
  'cake-slice': CakeSlice,
}

// ── Picker modal ────────────────────────────────────────────────

interface LayerTypePickerProps {
  onClose: () => void
}

export function LayerTypePicker({ onClose }: LayerTypePickerProps) {
  const t = useT()
  const addLayer = useRecipeFlowStore((s) => s.addLayer)

  function handleSelect(type: LayerType) {
    addLayer(type, t(LAYER_TYPE_META[type].labelKey))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl border border-border p-4 w-[300px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-3">{t('add_layer')}</h3>

        <div className="space-y-1.5">
          {LAYER_TYPES.map((type) => {
            const meta = LAYER_TYPE_META[type]
            const Icon = LAYER_ICON_MAP[meta.icon]

            return (
              <button
                key={type}
                type="button"
                onClick={() => handleSelect(type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                {Icon
                  ? <Icon className="size-5 flex-shrink-0 text-muted-foreground" />
                  : <span className="size-5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{t(meta.labelKey)}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t(meta.descriptionKey)}</div>
                </div>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: meta.defaultColor }}
                />
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground py-1.5 border border-border rounded-md"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
