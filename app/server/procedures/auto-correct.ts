import { z } from 'zod'
import { baseProcedure } from '../middleware/auth'
import { getScienceProvider } from '../middleware/science'
import { autoCorrectGraph } from '@commons/utils/recipe-auto-correct-manager'
import { reconcileGraph } from '../services/graph-reconciler.service'
import { reconcileGraphV2 } from '../services/graph-reconciler-v2.service'
import { reconcileInputSchema } from '../schemas/graph'
import { getFlags } from '../lib/feature-flags'

const autoCorrectInputSchema = z.object({
  graph: reconcileInputSchema.shape.graph,
  portioning: reconcileInputSchema.shape.portioning,
  meta: reconcileInputSchema.shape.meta,
  locale: z.string().default('it'),
  options: z.object({
    autoCorrect: z.boolean().default(true),
    reasoningLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
})

const autoCorrectOutputSchema = z.object({
  graph: z.any(),
  portioning: z.any(),
  warnings: z.array(z.any()),
  report: z.any().nullable(),
})

export const autoCorrect = baseProcedure
  .input(autoCorrectInputSchema)
  .output(autoCorrectOutputSchema)
  .handler(async ({ input }) => {
    const provider = await getScienceProvider()
    const { USE_V2_RECONCILER } = getFlags()
    const reconcileFn = USE_V2_RECONCILER ? reconcileGraphV2 : reconcileGraph
    const result = autoCorrectGraph(
      provider,
      reconcileFn,
      input.graph as any,
      input.portioning as any,
      { ...input.meta, locale: input.locale },
      {
        autoCorrect: input.options.autoCorrect,
        reasoningLevel: input.options.reasoningLevel,
      },
    )
    // Auto-correct returns graph + portioning + report.
    // Run a final reconcile to get warnings for the corrected graph.
    const finalResult = reconcileFn(
      result.graph as any,
      result.portioning as any,
      { ...input.meta, locale: input.locale },
      provider,
    )
    return {
      graph: result.graph,
      portioning: result.portioning,
      warnings: finalResult.warnings ?? [],
      report: result.report ?? null,
    }
  })
