import { baseProcedure } from '../middleware/auth'
import { z } from 'zod'
import { reconcileLayer } from '@commons/utils/layer-reconciler'
import { reconcileGraph } from '../services/graph-reconciler.service'
import { getScienceProvider } from '../middleware/science'

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
    const provider = await getScienceProvider()
    return reconcileLayer(provider, input.layer as any, input.meta, reconcileGraph)
  })
