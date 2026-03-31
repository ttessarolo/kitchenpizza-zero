import { z } from 'zod'

export const llmConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['ollama', 'hf_api', 'noop']),
  baseUrl: z.string(),
  model: z.string(),
  maxTokens: z.number(),
  timeoutMs: z.number(),
})

export type LlmConfig = z.infer<typeof llmConfigSchema>

export const ollamaModelSchema = z.object({
  name: z.string(),
  size: z.number(),
  modified_at: z.string(),
})

export const testConnectionOutputSchema = z.object({
  available: z.boolean(),
  models: z.array(ollamaModelSchema),
  currentModel: z.string(),
  latencyMs: z.number(),
})

export const promptEntrySchema = z.object({
  key: z.string(),
  labelKey: z.string(),
  descriptionKey: z.string(),
  category: z.enum(['explanation', 'constraint', 'compatibility', 'verification']),
  template: z.string(),
  variables: z.array(z.string()),
  defaultModel: z.string().optional(),
  lastModified: z.string(),
})

export const updatePromptInputSchema = z.object({
  key: z.string(),
  template: z.string(),
})

export const testPromptInputSchema = z.object({
  key: z.string(),
  variables: z.record(z.string(), z.string()),
})

export const testPromptOutputSchema = z.object({
  output: z.string().nullable(),
  latencyMs: z.number(),
  source: z.enum(['llm', 'fallback']),
})
