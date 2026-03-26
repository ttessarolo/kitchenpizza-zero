import { z } from 'zod'

const flourEntrySchema = z.object({
  key: z.string(),
  group: z.string(),
  label: z.string(),
  sub: z.string(),
  protein: z.number(),
  W: z.number(),
  PL: z.number(),
  absorption: z.number(),
  ash: z.number(),
  fiber: z.number(),
  starchDamage: z.number(),
  fermentSpeed: z.number(),
  fallingNumber: z.number(),
})

export const getCatalogOutputSchema = z.object({
  flours: z.array(flourEntrySchema),
  groups: z.array(z.string()),
})

export const getByIdInputSchema = z.object({
  key: z.string(),
})

export const getByIdOutputSchema = flourEntrySchema

export const searchInputSchema = z.object({
  query: z.string(),
})

export const searchOutputSchema = z.object({
  results: z.array(flourEntrySchema),
})

export const suggestForWInputSchema = z.object({
  targetW: z.number(),
  tolerance: z.number().default(50),
})

export const suggestForWOutputSchema = z.object({
  results: z.array(flourEntrySchema),
})

export const estimateWInputSchema = z.object({
  protein: z.number(),
})

export const estimateWOutputSchema = z.object({
  W: z.number(),
})
