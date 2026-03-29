import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import type { PrepMasterConfig as PrepCfg } from '@commons/types/recipe-layers'
import { LayerSubtypeSelector } from './LayerSubtypeSelector'

export function PrepMasterConfig() {
  const t = useT()
  const layers = useRecipeFlowStore((s) => s.layers)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)
  const updateLayerSubtype = useRecipeFlowStore((s) => s.updateLayerSubtype)
  const updateLayerVariant = useRecipeFlowStore((s) => s.updateLayerVariant)

  const layer = layers.find((l) => l.id === activeLayerId)
  if (!layer || layer.masterConfig.type !== 'prep') return null
  const cfg = layer.masterConfig.config

  function update(patch: Partial<PrepCfg>) {
    const newConfig: PrepCfg = { ...cfg, ...patch }
    useRecipeFlowStore.setState((s) => ({
      layers: s.layers.map((l) =>
        l.id === activeLayerId
          ? { ...l, masterConfig: { type: 'prep' as const, config: newConfig } }
          : l,
      ),
    }))
  }

  return (
    <div className="space-y-3">
      <LayerSubtypeSelector
        layerType="prep"
        currentSubtype={layer.subtype}
        currentVariant={layer.variant}
        onSubtypeChange={(subtype, variant) => updateLayerSubtype(layer.id, subtype, variant)}
        onVariantChange={(variant) => updateLayerVariant(layer.id, variant)}
      />
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('servings')}</label>
        <input type="number" value={cfg.servings} onChange={(e) => update({ servings: +e.target.value || 0 })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={1} step={1} />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('yield')}</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={cfg.yield} onChange={(e) => update({ yield: +e.target.value || 0 })}
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={0} step={50} />
          <span className="text-[10px] text-muted-foreground">g</span>
        </div>
      </div>
    </div>
  )
}
