import { resolve } from 'path'
import { baseProcedure } from '../middleware/auth'
import { reconcileInputSchema, reconcileOutputSchema } from '../schemas/graph'
import { reconcileGraph } from '../services/graph-reconciler.service'
import { reconcileGraphV2 } from '../services/graph-reconciler-v2.service'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { getFlags } from '../lib/feature-flags'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

export const reconcile = baseProcedure
  .input(reconcileInputSchema)
  .output(reconcileOutputSchema)
  .handler(async ({ input }) => {
    const { USE_V2_RECONCILER } = getFlags()
    const fn = USE_V2_RECONCILER ? reconcileGraphV2 : reconcileGraph
    const locale = (input as any).locale ?? 'it'
    return fn(
      input.graph as any,
      input.portioning as any,
      { ...input.meta, locale },
      provider,
    )
  })
