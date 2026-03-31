import { baseProcedure } from '../middleware/auth'
import { z } from 'zod'
import {
  llmConfigSchema,
  testConnectionOutputSchema,
  promptEntrySchema,
  updatePromptInputSchema,
  testPromptInputSchema,
  testPromptOutputSchema,
} from '../schemas/ai-admin'
import { getFlags } from '../lib/feature-flags'
import { llmService, getCurrentProvider, resetLlmProvider } from '../services/llm/llm-service'
import { OllamaProvider } from '../services/llm/ollama-provider'
import {
  getAllPrompts,
  getPrompt,
  updatePrompt,
  resetPrompt,
  getPromptTemplate,
  fillTemplate,
} from '../services/llm/prompt-store'

export const getConfig = baseProcedure
  .output(llmConfigSchema)
  .handler(async () => {
    const flags = getFlags()
    return {
      enabled: flags.LLM_ENABLED,
      provider: flags.LLM_PROVIDER,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'qwen3.5:0.8b',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '512', 10),
      timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10),
    }
  })

export const testConnection = baseProcedure
  .output(testConnectionOutputSchema)
  .handler(async () => {
    const start = Date.now()
    const provider = getCurrentProvider()
    const available = await provider.isAvailable()
    const latencyMs = Date.now() - start

    let models: Array<{ name: string; size: number; modified_at: string }> = []
    let currentModel = process.env.OLLAMA_MODEL || 'qwen3.5:0.8b'

    if (provider instanceof OllamaProvider) {
      models = await provider.listModels()
      currentModel = provider.getModel()
    }

    return { available, models, currentModel, latencyMs }
  })

export const listPrompts = baseProcedure
  .output(z.array(promptEntrySchema))
  .handler(async () => getAllPrompts())

export const getPromptProcedure = baseProcedure
  .input(z.object({ key: z.string() }))
  .output(promptEntrySchema.nullable())
  .handler(async ({ input }) => getPrompt(input.key))

export const updatePromptProcedure = baseProcedure
  .input(updatePromptInputSchema)
  .output(promptEntrySchema.nullable())
  .handler(async ({ input }) => updatePrompt(input.key, input.template))

export const resetPromptProcedure = baseProcedure
  .input(z.object({ key: z.string() }))
  .output(promptEntrySchema.nullable())
  .handler(async ({ input }) => resetPrompt(input.key))

export const testPrompt = baseProcedure
  .input(testPromptInputSchema)
  .output(testPromptOutputSchema)
  .handler(async ({ input }) => {
    const template = getPromptTemplate(input.key)
    if (!template) return { output: null, latencyMs: 0, source: 'fallback' as const }

    const prompt = fillTemplate(template, input.variables)
    const start = Date.now()
    const output = await llmService.generate(prompt)
    const latencyMs = Date.now() - start

    return {
      output,
      latencyMs,
      source: output ? ('llm' as const) : ('fallback' as const),
    }
  })
