import { z } from 'zod'

// ── Flour blending ─────────────────────────────────────────────

const flourIngredientSchema = z.object({
  id: z.number(),
  type: z.string(),
  g: z.number(),
  temp: z.number().nullable(),
})

const liquidIngredientSchema = z.object({
  id: z.number(),
  type: z.string(),
  g: z.number(),
  temp: z.number().nullable(),
})

export const blendFloursInputSchema = z.object({
  flours: z.array(flourIngredientSchema),
})

const blendedPropsSchema = z.object({
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

export const blendFloursOutputSchema = blendedPropsSchema

// ── Yeast calculation ──────────────────────────────────────────

export const calcYeastInputSchema = z.object({
  hours: z.number().min(0).max(98),
  hydration: z.number().min(30).max(130),
  tempC: z.number().min(1).max(45).default(24),
})

export const calcYeastOutputSchema = z.object({
  yeastPct: z.number(),
})

// ── Dough temperature ──────────────────────────────────────────

export const calcTempInputSchema = z.object({
  flours: z.array(flourIngredientSchema),
  liquids: z.array(liquidIngredientSchema),
  ambientTemp: z.number(),
  frictionFactor: z.number().default(0),
})

export const calcTempOutputSchema = z.object({
  finalTemp: z.number(),
})

// ── Dough defaults ─────────────────────────────────────────────

export const getDefaultsInputSchema = z.object({
  recipeType: z.string(),
  recipeSubtype: z.string().nullable(),
})

export const getDefaultsOutputSchema = z.object({
  type: z.string(),
  subtype: z.string().nullable(),
  defaultDoughHours: z.number(),
  saltPctDefault: z.number(),
  saltPctRange: z.tuple([z.number(), z.number()]),
  fatPctDefault: z.number(),
  fatPctRange: z.tuple([z.number(), z.number()]),
})

// ── Dough warnings ─────────────────────────────────────────────

export const getWarningsInputSchema = z.object({
  doughHours: z.number(),
  yeastPct: z.number(),
  saltPct: z.number(),
  fatPct: z.number(),
  hydration: z.number(),
  recipeType: z.string(),
  recipeSubtype: z.string().nullable(),
})

const warningSchema = z.object({
  id: z.string(),
  category: z.string(),
  severity: z.enum(['info', 'warning', 'error']),
  messageKey: z.string(),
  messageVars: z.record(z.string(), z.unknown()).optional(),
  selectionMode: z.enum(['choose_one', 'all']).optional(),
})

export const getWarningsOutputSchema = z.object({
  warnings: z.array(warningSchema),
})
