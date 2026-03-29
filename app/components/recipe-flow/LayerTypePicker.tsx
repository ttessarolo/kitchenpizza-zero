import { useState, useMemo } from 'react'
import {
  Wheat,
  Droplet,
  Utensils,
  FlaskConical,
  CakeSlice,
  Search,
  ArrowLeft,
} from 'lucide-react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { LAYER_TYPES, LAYER_TYPE_META } from '@commons/constants/layer-defaults'
import { LAYER_SUBTYPES, getDefaultVariant } from '@commons/constants/layer-subtypes'
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
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<LayerType | null>(null)

  // Filter types or subtypes based on search
  const filteredTypes = useMemo(() => {
    if (!search.trim()) return LAYER_TYPES
    const q = search.toLowerCase()
    return LAYER_TYPES.filter((type) => {
      const meta = LAYER_TYPE_META[type]
      const label = t(meta.labelKey).toLowerCase()
      const desc = t(meta.descriptionKey).toLowerCase()
      // Also match subtypes within this type
      const subtypeMatch = LAYER_SUBTYPES[type].some(
        (s) => t(s.labelKey).toLowerCase().includes(q),
      )
      return label.includes(q) || desc.includes(q) || subtypeMatch
    })
  }, [search, t])

  const filteredSubtypes = useMemo(() => {
    if (!selectedType) return []
    const subtypes = LAYER_SUBTYPES[selectedType]
    if (!search.trim()) return subtypes
    const q = search.toLowerCase()
    return subtypes.filter((s) => t(s.labelKey).toLowerCase().includes(q))
  }, [selectedType, search, t])

  function handleSelectSubtype(type: LayerType, subtypeKey: string) {
    const subtypeEntry = LAYER_SUBTYPES[type].find((s) => s.key === subtypeKey)
    const name = subtypeEntry ? t(subtypeEntry.labelKey) : t(LAYER_TYPE_META[type].labelKey)
    const variant = getDefaultVariant(type, subtypeKey)
    addLayer(type, subtypeKey, variant, name)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl border border-border w-[420px] max-w-[90vw] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            {selectedType && (
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <h3 className="text-base font-semibold">
              {selectedType ? t(LAYER_TYPE_META[selectedType].labelKey) : t('add_layer')}
            </h3>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search_layer_type')}
              className="w-full text-sm bg-muted/30 border border-border rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2">
          {selectedType === null ? (
            // Step 1: Type list
            filteredTypes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                {t('no_results')}
              </div>
            ) : (
              filteredTypes.map((type) => {
                const meta = LAYER_TYPE_META[type]
                const Icon = LAYER_ICON_MAP[meta.icon]
                const subtypeCount = LAYER_SUBTYPES[type].length

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                  >
                    {Icon
                      ? <Icon className="size-6 flex-shrink-0 text-muted-foreground" />
                      : <span className="size-6 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t(meta.labelKey)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t(meta.descriptionKey)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground">{subtypeCount}</span>
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: meta.defaultColor }}
                      />
                    </div>
                  </button>
                )
              })
            )
          ) : (
            // Step 2: Subtype list
            filteredSubtypes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                {t('no_results')}
              </div>
            ) : (
              filteredSubtypes.map((subtype) => {
                const meta = LAYER_TYPE_META[selectedType]
                return (
                  <button
                    key={subtype.key}
                    type="button"
                    onClick={() => handleSelectSubtype(selectedType, subtype.key)}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: meta.defaultColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t(subtype.labelKey)}</div>
                    </div>
                  </button>
                )
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-2 border-t border-border">
          <button
            type="button"
            onClick={selectedType ? () => setSelectedType(null) : onClose}
            className="w-full text-sm text-muted-foreground hover:text-foreground py-2 border border-border rounded-lg"
          >
            {selectedType ? t('back_to_types') : t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
