import { resolve } from 'path'
import { baseProcedure } from '../middleware/auth'
import { reconcileInputSchema, reconcileOutputSchema } from '../schemas/graph'
import { reconcileGraph } from '../services/graph-reconciler.service'
import { FileScienceProvider } from '@commons/utils/science/science-provider'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

export const reconcile = baseProcedure
  .input(reconcileInputSchema)
  .output(reconcileOutputSchema)
  .handler(async ({ input }) => {
    return reconcileGraph(
      input.graph as any,
      input.portioning as any,
      { ...input.meta, locale: 'it' },
      provider,
    )
  })
