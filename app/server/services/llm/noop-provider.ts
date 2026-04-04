/**
 * NoopProvider — graceful degradation when LLM is disabled.
 * Returns null for all operations. The system works identically without LLM.
 */
export interface LlmGenerateOptions {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface LlmProvider {
  /** Check if the provider is available and ready */
  isAvailable(): Promise<boolean>

  /** Generate text from a prompt. Returns null if unavailable. */
  generate(
    prompt: string,
    options?: LlmGenerateOptions,
  ): Promise<string | null>

  /** Generate structured JSON output matching a schema. Returns null if unavailable. */
  generateJSON<T>(
    prompt: string,
    schema: { parse: (v: unknown) => T },
    options?: LlmGenerateOptions,
  ): Promise<T | null>
}

export class NoopProvider implements LlmProvider {
  async isAvailable(): Promise<boolean> {
    return false
  }
  async generate(
    _prompt: string,
    _options?: LlmGenerateOptions,
  ): Promise<string | null> {
    return null
  }
  async generateJSON<T>(
    _prompt: string,
    _schema: { parse: (v: unknown) => T },
    _options?: LlmGenerateOptions,
  ): Promise<T | null> {
    return null
  }
}
