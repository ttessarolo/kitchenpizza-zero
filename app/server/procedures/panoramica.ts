import { baseProcedure } from '../middleware/auth'
import { z } from 'zod'
import { computePanoramica } from '@commons/utils/panoramica-manager'
import { getScienceProvider } from '../middleware/science'
import type { RecipeLayer, CrossLayerEdge } from '@commons/types/recipe-layers'

const layerSummarySchema = z.object({
  layerId: z.string(),
  layerType: z.string(),
  name: z.string(),
  nodeCount: z.number(),
  totalDuration: z.number(),
  criticalPath: z.array(z.string()),
})

const crossDependencySchema = z.object({
  edgeId: z.string(),
  sourceLayerId: z.string(),
  sourceNodeId: z.string(),
  targetLayerId: z.string(),
  targetNodeId: z.string(),
  label: z.string(),
})

const panoramicaOutputSchema = z.object({
  layers: z.array(layerSummarySchema),
  crossDependencies: z.array(crossDependencySchema),
  totalDuration: z.number(),
  criticalLayerId: z.string(),
})

const panoramicaInputSchema = z.object({
  layers: z.array(z.record(z.string(), z.unknown())),
  meta: z.object({
    name: z.string(),
    author: z.string(),
    type: z.string(),
    subtype: z.string(),
    locale: z.string(),
  }),
  crossEdges: z.array(z.record(z.string(), z.unknown())).optional(),
})

export const computePanoramicaProcedure = baseProcedure
  .input(panoramicaInputSchema)
  .output(panoramicaOutputSchema)
  .handler(async ({ input }) => {
    const provider = await getScienceProvider()
    const layers = input.layers as unknown as RecipeLayer[]
    const crossEdges = (input.crossEdges ?? []) as unknown as CrossLayerEdge[]
    return computePanoramica(provider, layers, crossEdges)
  })
