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
import { LAYER_SUBTYPES, getVariants } from '@commons/constants/layer-subtypes'
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
  mode?: 'inline' | 'onboarding'
  onSkip?: () => void
}

export function LayerTypePicker({ onClose, mode = 'inline', onSkip }: LayerTypePickerProps) {
  const t = useT()
  const addLayer = useRecipeFlowStore((s) => s.addLayer)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<LayerType | null>(null)
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null)

  // ── Filtered lists ──

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return LAYER_TYPES
    const q = search.toLowerCase()
    return LAYER_TYPES.filter((type) => {
      const meta = LAYER_TYPE_META[type]
      const label = t(meta.labelKey).toLowerCase()
      const desc = t(meta.descriptionKey).toLowerCase()
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

  const filteredVariants = useMemo(() => {
    if (!selectedType || !selectedSubtype) return []
    const variants = getVariants(selectedType, selectedSubtype)
    if (!search.trim()) return variants
    const q = search.toLowerCase()
    return variants.filter((v) => t(v.labelKey).toLowerCase().includes(q))
  }, [selectedType, selectedSubtype, search, t])

  // ── Handlers ──

  function handleSelectSubtype(subtypeKey: string) {
    setSelectedSubtype(subtypeKey)
    setSearch('')
  }

  function handleSelectVariant(variantKey: string) {
    if (!selectedType || !selectedSubtype) return
    const subtypeEntry = LAYER_SUBTYPES[selectedType].find((s) => s.key === selectedSubtype)
    const name = subtypeEntry ? t(subtypeEntry.labelKey) : t(LAYER_TYPE_META[selectedType].labelKey)
    addLayer(selectedType, selectedSubtype, variantKey, name)
    onClose()
  }

  function handleBack() {
    setSearch('')
    if (selectedSubtype) {
      setSelectedSubtype(null)
    } else if (selectedType) {
      setSelectedType(null)
    } else {
      onClose()
    }
  }

  // ── Current step ──

  const step = selectedSubtype ? 3 : selectedType ? 2 : 1

  const headerTitle = step === 3
    ? t(LAYER_SUBTYPES[selectedType!].find((s) => s.key === selectedSubtype)?.labelKey ?? '')
    : step === 2
      ? t(LAYER_TYPE_META[selectedType!].labelKey)
      : t('add_layer')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl border border-border w-[420px] max-w-[90vw] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <h3 className="text-base font-semibold">{headerTitle}</h3>
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
          {step === 1 && (
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
                const isDisabled = !!meta.disabled

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { if (!isDisabled) { setSelectedType(type); setSearch('') } }}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors text-left ${
                      isDisabled
                        ? 'border-border/50 opacity-40 cursor-not-allowed'
                        : 'border-border hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    {Icon
                      ? <Icon className="size-6 flex-shrink-0 text-muted-foreground" />
                      : <span className="size-6 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t(meta.labelKey)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {isDisabled ? t('layer_type_coming_soon') : t(meta.descriptionKey)}
                      </div>
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
          )}

          {step === 2 && (
            // Step 2: Subtype list
            filteredSubtypes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                {t('no_results')}
              </div>
            ) : (
              filteredSubtypes.map((subtype) => {
                const meta = LAYER_TYPE_META[selectedType!]
                return (
                  <button
                    key={subtype.key}
                    type="button"
                    onClick={() => handleSelectSubtype(subtype.key)}
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

          {step === 3 && (
            // Step 3: Variant list
            filteredVariants.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                {t('no_results')}
              </div>
            ) : (
              filteredVariants.map((variant) => {
                const meta = LAYER_TYPE_META[selectedType!]
                return (
                  <button
                    key={variant.key}
                    type="button"
                    onClick={() => handleSelectVariant(variant.key)}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: meta.defaultColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t(variant.labelKey)}</div>
                    </div>
                  </button>
                )
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-2 border-t border-border flex gap-2">
          {mode === 'onboarding' && step === 1 && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 text-sm text-muted-foreground/50 hover:text-muted-foreground py-2 border border-border/50 rounded-lg transition-colors"
            >
              {t('skip_layer_selection')}
            </button>
          )}
          <button
            type="button"
            onClick={handleBack}
            className={`${mode === 'onboarding' && step === 1 && onSkip ? 'flex-1' : 'w-full'} text-sm text-muted-foreground hover:text-foreground py-2 border border-border rounded-lg`}
          >
            {step === 3 ? t('back_to_subtypes') : step === 2 ? t('back_to_types') : t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
