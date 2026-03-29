import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { ImpastoMasterConfig } from './ImpastoMasterConfig'
import { SauceMasterConfig } from './SauceMasterConfig'
import { PrepMasterConfig } from './PrepMasterConfig'
import { FermentMasterConfig } from './FermentMasterConfig'
import { PastryMasterConfig } from './PastryMasterConfig'

export function LayerMasterConfig() {
  const layers = useRecipeFlowStore((s) => s.layers)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)
  const activeLayer = layers.find((l) => l.id === activeLayerId)
  if (!activeLayer) return null

  switch (activeLayer.masterConfig.type) {
    case 'impasto': return <ImpastoMasterConfig />
    case 'sauce': return <SauceMasterConfig />
    case 'prep': return <PrepMasterConfig />
    case 'ferment': return <FermentMasterConfig />
    case 'pastry': return <PastryMasterConfig />
  }
}
