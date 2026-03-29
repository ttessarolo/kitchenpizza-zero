import { DoughCompositionPanel } from '~/components/recipe-flow/DoughCompositionPanel'
import { DoughTotalsPanel } from '~/components/recipe-flow/DoughTotalsPanel'

export function ImpastoMasterConfig() {
  return (
    <>
      <DoughCompositionPanel />
      <DoughTotalsPanel />
    </>
  )
}
