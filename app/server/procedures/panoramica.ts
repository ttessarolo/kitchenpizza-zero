import { baseProcedure } from '../middleware/auth'
import { z } from 'zod'

/**
 * Panoramica (overview) procedure — computes a cross-layer summary.
 *
 * Accepts all layers and returns an aggregated timeline + summary.
 * The panoramica-manager will be implemented in commons/utils/;
 * for now this procedure provides the oRPC endpoint skeleton.
 */

const layerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  nodeCount: z.number(),
  totalDuration: z.number().nullable(),
  warnings: z.number(),
})

const timelineEntrySchema = z.object({
  layerId: z.string(),
  layerName: z.string(),
  nodeId: z.string(),
  nodeTitle: z.string(),
  startMin: z.number(),
  durationMin: z.number(),
})

const panoramicaOutputSchema = z.object({
  layers: z.array(layerSummarySchema),
  timeline: z.array(timelineEntrySchema),
  totalDurationMin: z.number().nullable(),
})

export const computePanoramica = baseProcedure
  .input(z.object({
    layers: z.array(z.record(z.string(), z.unknown())),
    meta: z.object({
      name: z.string(),
      author: z.string(),
      type: z.string(),
      subtype: z.string(),
      locale: z.string(),
    }),
  }))
  .output(panoramicaOutputSchema)
  .handler(async ({ input }) => {
    // Skeleton: summarize layers without full manager yet
    const layers = (input.layers as any[]).map((l) => ({
      id: l.id ?? '',
      name: l.name ?? '',
      type: l.masterConfig?.type ?? 'unknown',
      nodeCount: Object.keys(l.nodes ?? {}).length,
      totalDuration: null,
      warnings: 0,
    }))

    return {
      layers,
      timeline: [],
      totalDurationMin: null,
    }
  })
