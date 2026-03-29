import { resolve } from 'path'
import { baseProcedure } from '../middleware/auth'
import { z } from 'zod'
import { reconcileLayer } from '@commons/utils/layer-reconciler'
import { reconcileGraph } from '../services/graph-reconciler.service'
import { FileScienceProvider } from '@commons/utils/science/science-provider'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

export const reconcileLayerProcedure = baseProcedure
  .input(z.object({
    layer: z.record(z.string(), z.unknown()),
    meta: z.object({
      name: z.string(),
      author: z.string(),
      type: z.string(),
      subtype: z.string(),
      locale: z.string(),
    }),
  }))
  .handler(async ({ input }) => {
    return reconcileLayer(provider, input.layer as any, input.meta, reconcileGraph)
  })
