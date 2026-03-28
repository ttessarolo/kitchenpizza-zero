import { z } from 'zod'

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  subtype: z.string().nullable(),
  position: z.object({ x: z.number(), y: z.number() }),
  lane: z.string(),
  data: z.record(z.string(), z.unknown()),
})

const edgeDataSchema = z.object({
  scheduleTimeRatio: z.number().min(0).max(1).default(1),
  scheduleQtyRatio: z.number().min(0).max(1).default(1),
})

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  data: edgeDataSchema,
})

const graphSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  lanes: z.array(z.record(z.string(), z.unknown())),
})

export const totalDurationInputSchema = graphSchema

export const totalDurationOutputSchema = z.object({
  spanMinutes: z.number(),
})
