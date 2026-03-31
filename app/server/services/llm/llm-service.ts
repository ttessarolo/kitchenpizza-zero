import { getFlags } from '../../lib/feature-flags'
import type { LlmProvider } from './noop-provider'
import { NoopProvider } from './noop-provider'
import { HfApiProvider } from './hf-api-provider'
import { OllamaProvider } from './ollama-provider'

let cachedProvider: LlmProvider | null = null

function getProvider(): LlmProvider {
  if (cachedProvider) return cachedProvider

  const flags = getFlags()
  if (!flags.LLM_ENABLED) {
    cachedProvider = new NoopProvider()
    return cachedProvider
  }

  switch (flags.LLM_PROVIDER) {
    case 'ollama':
      cachedProvider = new OllamaProvider()
      break
    case 'hf_api':
      cachedProvider = new HfApiProvider()
      break
    default:
      cachedProvider = new NoopProvider()
  }

  return cachedProvider
}

/** Reset cached provider (useful for testing or config changes) */
export function resetLlmProvider(): void {
  cachedProvider = null
}

/** Get the current provider instance (for admin panel inspection) */
export function getCurrentProvider(): LlmProvider {
  return getProvider()
}

export const llmService = {
  /** Check if LLM is available */
  isAvailable: () => getProvider().isAvailable(),

  /** Generate free-form text */
  generate: (
    prompt: string,
    options?: { maxTokens?: number; temperature?: number },
  ) => getProvider().generate(prompt, options),

  /** Generate structured JSON matching a Zod schema */
  generateJSON: <T>(prompt: string, schema: { parse: (v: unknown) => T }) =>
    getProvider().generateJSON(prompt, schema),
}
