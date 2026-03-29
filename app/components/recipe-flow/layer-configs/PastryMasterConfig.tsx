import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import type { PastryMasterConfig as PastryCfg } from '@commons/types/recipe-layers'

const PASTRY_TYPES = ['cream', 'custard', 'ganache', 'mousse', 'meringue', 'glaze', 'other'] as const

export function PastryMasterConfig() {
  const t = useT()
  const layers = useRecipeFlowStore((s) => s.layers)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)

  const layer = layers.find((l) => l.id === activeLayerId)
  if (!layer || layer.masterConfig.type !== 'pastry') return null
  const cfg = layer.masterConfig.config

  function update(patch: Partial<PastryCfg>) {
    const newConfig: PastryCfg = { ...cfg, ...patch }
    useRecipeFlowStore.setState((s) => ({
      layers: s.layers.map((l) =>
        l.id === activeLayerId
          ? { ...l, masterConfig: { type: 'pastry' as const, config: newConfig } }
          : l,
      ),
    }))
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('pastry_type')}</label>
        <select value={cfg.pastryType} onChange={(e) => update({ pastryType: e.target.value })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary">
          {PASTRY_TYPES.map((pt) => <option key={pt} value={pt}>{t(`pastry_type_${pt}`)}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('target_weight')}</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={cfg.targetWeight} onChange={(e) => update({ targetWeight: +e.target.value || 0 })}
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={0} step={50} />
          <span className="text-[10px] text-muted-foreground">g</span>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('servings')}</label>
        <input type="number" value={cfg.servings} onChange={(e) => update({ servings: +e.target.value || 0 })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={1} step={1} />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('temperature_notes')}</label>
        <input type="text" value={cfg.temperatureNotes} onChange={(e) => update({ temperatureNotes: e.target.value })}
          placeholder={t('temperature_notes_placeholder')}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" />
      </div>
    </div>
  )
}
