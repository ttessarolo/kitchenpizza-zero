import { z } from 'zod'

const riseMethodSchema = z.object({
  key: z.string(),
  labelKey: z.string(),
  tf: z.number(),
})

export const getMethodsOutputSchema = z.object({
  methods: z.array(riseMethodSchema),
})

export const calcDurationInputSchema = z.object({
  base: z.number().default(60),
  method: z.string(),
  flourW: z.number(),
  flourProtein: z.number(),
  flourPL: z.number(),
  flourAbsorption: z.number(),
  flourFiber: z.number().default(2.5),
  flourStarchDamage: z.number().default(7),
  flourFermentSpeed: z.number().default(1),
  flourFallingNumber: z.number().default(300),
  yeastPct: z.number(),
  yeastSpeedFactor: z.number().default(1),
  temperatureFactor: z.number().default(1),
  saltPct: z.number().default(2.5),
  sugarPct: z.number().default(0),
  fatPct: z.number().default(0),
})

export const calcDurationOutputSchema = z.object({
  durationMin: z.number(),
})

export const maxHoursForWInputSchema = z.object({
  W: z.number(),
})

export const maxHoursForWOutputSchema = z.object({
  maxHours: z.number(),
})
