import { z } from 'zod'

export const explainWarningInputSchema = z.object({
  messageKey: z.string(),
  messageVars: z.record(z.string(), z.unknown()).optional(),
  context: z.string().optional(),
  locale: z.string().default('it'),
})

export const explainWarningOutputSchema = z.object({
  explanation: z.string().nullable(),
  source: z.enum(['llm', 'fallback']),
})

export const nlToConstraintsInputSchema = z.object({
  userInput: z.string(),
  recipeSummary: z.string().optional(),
  locale: z.string().default('it'),
})

export const nlToConstraintsOutputSchema = z.object({
  constraints: z
    .object({
      targetHydration: z.number().nullable().optional(),
      targetDoughHours: z.number().nullable().optional(),
      flourTypes: z.array(z.string()).nullable().optional(),
      ovenType: z.string().nullable().optional(),
      maxTemp: z.number().nullable().optional(),
      deadline: z.string().nullable().optional(),
      servings: z.number().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
    .nullable(),
  source: z.enum(['llm', 'fallback']),
})

export const checkCompatInputSchema = z.object({
  layer1Summary: z.string(),
  layer2Summary: z.string(),
  locale: z.string().default('it'),
})

export const checkCompatOutputSchema = z.object({
  result: z
    .object({
      compatible: z.boolean(),
      score: z.number(),
      reasoning: z.string(),
      suggestions: z.array(z.string()),
    })
    .nullable(),
  source: z.enum(['llm', 'fallback']),
})
