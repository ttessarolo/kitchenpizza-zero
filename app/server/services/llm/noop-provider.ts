/**
 * NoopProvider — graceful degradation when LLM is disabled.
 * Returns null for all operations. The system works identically without LLM.
 */
export interface LlmProvider {
  /** Check if the provider is available and ready */
  isAvailable(): Promise<boolean>

  /** Generate text from a prompt. Returns null if unavailable. */
  generate(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string | null>

  /** Generate structured JSON output matching a schema. Returns null if unavailable. */
  generateJSON<T>(
    prompt: string,
    schema: { parse: (v: unknown) => T },
  ): Promise<T | null>
}

export class NoopProvider implements LlmProvider {
  async isAvailable(): Promise<boolean> {
    return false
  }
  async generate(): Promise<string | null> {
    return null
  }
  async generateJSON(): Promise<null> {
    return null
  }
}
