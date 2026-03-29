import { z } from 'zod'

const portioningSchema = z.object({
  mode: z.enum(['tray', 'ball']),
  tray: z.object({
    preset: z.string(),
    l: z.number(), w: z.number(), h: z.number(),
    material: z.string(), griglia: z.boolean(), count: z.number(),
  }),
  ball: z.object({ weight: z.number(), count: z.number() }),
  thickness: z.number(),
  targetHyd: z.number(),
  doughHours: z.number(),
  yeastPct: z.number(),
  saltPct: z.number(),
  fatPct: z.number(),
  preImpasto: z.string().nullable(),
  preFermento: z.string().nullable(),
  flourMix: z.array(z.string()).default([]),
})

export const calcTargetInputSchema = portioningSchema

export const calcTargetOutputSchema = z.object({
  targetWeight: z.number(),
})
