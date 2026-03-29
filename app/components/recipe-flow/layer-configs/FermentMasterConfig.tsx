import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import type { FermentMasterConfig as FermentCfg } from '@commons/types/recipe-layers'

const FERMENT_TYPES = ['lacto', 'alcoholic', 'acetic', 'mixed', 'other'] as const
const VESSEL_TYPES = ['jar', 'crock', 'bucket', 'barrel', 'bag', 'other'] as const

export function FermentMasterConfig() {
  const t = useT()
  const layers = useRecipeFlowStore((s) => s.layers)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)

  const layer = layers.find((l) => l.id === activeLayerId)
  if (!layer || layer.masterConfig.type !== 'ferment') return null
  const cfg = layer.masterConfig.config

  function update(patch: Partial<FermentCfg>) {
    const newConfig: FermentCfg = { ...cfg, ...patch }
    useRecipeFlowStore.setState((s) => ({
      layers: s.layers.map((l) =>
        l.id === activeLayerId
          ? { ...l, masterConfig: { type: 'ferment' as const, config: newConfig } }
          : l,
      ),
    }))
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('ferment_type')}</label>
        <select value={cfg.fermentType} onChange={(e) => update({ fermentType: e.target.value })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary">
          {FERMENT_TYPES.map((ft) => <option key={ft} value={ft}>{t(`ferment_type_${ft}`)}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('salt_percentage')}</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={cfg.saltPercentage} onChange={(e) => update({ saltPercentage: +e.target.value || 0 })}
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={0} max={25} step={0.1} />
          <span className="text-[10px] text-muted-foreground">%</span>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('target_ph')}</label>
        <input type="number" value={cfg.targetPH} onChange={(e) => update({ targetPH: +e.target.value || 0 })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={1} max={14} step={0.1} />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('temperature')}</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={cfg.temperature} onChange={(e) => update({ temperature: +e.target.value || 0 })}
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={0} max={60} step={1} />
          <span className="text-[10px] text-muted-foreground">°C</span>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('duration')}</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={cfg.duration} onChange={(e) => update({ duration: +e.target.value || 0 })}
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" min={0} step={1} />
          <span className="text-[10px] text-muted-foreground">h</span>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{t('vessel')}</label>
        <select value={cfg.vessel} onChange={(e) => update({ vessel: e.target.value })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary">
          {VESSEL_TYPES.map((v) => <option key={v} value={v}>{t(`vessel_${v}`)}</option>)}
        </select>
      </div>
    </div>
  )
}
