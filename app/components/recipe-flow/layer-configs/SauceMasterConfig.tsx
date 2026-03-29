import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import type { SauceMasterConfig as SauceCfg } from '@commons/types/recipe-layers'
import { LayerSubtypeSelector } from './LayerSubtypeSelector'

const CONSISTENCIES = ['thin', 'medium', 'thick'] as const

export function SauceMasterConfig() {
  const t = useT()
  const layers = useRecipeFlowStore((s) => s.layers)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)
  const updateLayerSubtype = useRecipeFlowStore((s) => s.updateLayerSubtype)
  const updateLayerVariant = useRecipeFlowStore((s) => s.updateLayerVariant)

  const layer = layers.find((l) => l.id === activeLayerId)
  if (!layer || layer.masterConfig.type !== 'sauce') return null
  const cfg = layer.masterConfig.config

  function update(patch: Partial<SauceCfg>) {
    const newConfig: SauceCfg = { ...cfg, ...patch }
    useRecipeFlowStore.setState((s) => ({
      layers: s.layers.map((l) =>
        l.id === activeLayerId
          ? { ...l, masterConfig: { type: 'sauce' as const, config: newConfig } }
          : l,
      ),
    }))
  }

  return (
    <div className="space-y-3">
      <LayerSubtypeSelector
        layerType="sauce"
        currentSubtype={layer.subtype}
        currentVariant={layer.variant}
        onSubtypeChange={(subtype, variant) => updateLayerSubtype(layer.id, subtype, variant)}
        onVariantChange={(variant) => updateLayerVariant(layer.id, variant)}
      />
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('target_volume')}</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={cfg.targetVolume} onChange={(e) => update({ targetVolume: +e.target.value || 0 })}
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={0} step={50} />
          <span className="text-[10px] text-muted-foreground">ml</span>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('target_consistency')}</label>
        <select value={cfg.targetConsistency} onChange={(e) => update({ targetConsistency: e.target.value as SauceCfg['targetConsistency'] })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary">
          {CONSISTENCIES.map((c) => <option key={c} value={c}>{t(`consistency_${c}`)}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('serving')}</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={cfg.serving} onChange={(e) => update({ serving: +e.target.value || 0 })}
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={1} step={1} />
          <span className="text-[10px] text-muted-foreground">{t('portions')}</span>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('shelf_life')}</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={cfg.shelfLife} onChange={(e) => update({ shelfLife: +e.target.value || 0 })}
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={0} step={1} />
          <span className="text-[10px] text-muted-foreground">{t('days')}</span>
        </div>
      </div>
    </div>
  )
}
