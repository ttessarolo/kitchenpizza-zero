import type { LlmProvider } from './noop-provider'

/**
 * OllamaProvider — connects to Ollama API (local or remote).
 * Same code for dev (localhost:11434) and production (remote VPS).
 * Model: qwen3.5:0.8b (configurable via env/admin).
 */
export class OllamaProvider implements LlmProvider {
  private baseUrl: string
  private model: string
  private maxTokens: number
  private timeoutMs: number

  constructor(config?: { baseUrl?: string; model?: string; maxTokens?: number; timeoutMs?: number }) {
    this.baseUrl = config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.model = config?.model || process.env.OLLAMA_MODEL || 'qwen3.5:0.8b'
    this.maxTokens = config?.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || '512', 10)
    this.timeoutMs = config?.timeoutMs || parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10)
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal })
      clearTimeout(timeout)
      if (!response.ok) return false
      const data = await response.json() as { models?: Array<{ name: string }> }
      // Check if our model is available
      return data.models?.some(m => m.name === this.model || m.name.startsWith(this.model.split(':')[0])) ?? false
    } catch {
      return false
    }
  }

  /** List available models from Ollama */
  async listModels(): Promise<Array<{ name: string; size: number; modified_at: string }>> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal })
      clearTimeout(timeout)
      if (!response.ok) return []
      const data = await response.json() as { models?: Array<{ name: string; size: number; modified_at: string }> }
      return data.models ?? []
    } catch {
      return []
    }
  }

  async generate(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            num_predict: options?.maxTokens ?? this.maxTokens,
            temperature: options?.temperature ?? 0.3,
          },
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        console.error(`Ollama API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data = await response.json() as { response?: string; thinking?: string }
      // Qwen3.5 models put content in 'thinking' field, others use 'response'
      return data.response || data.thinking || null
    } catch (e) {
      console.error('Ollama API error:', (e as Error).message)
      return null
    }
  }

  async generateJSON<T>(prompt: string, schema: { parse: (v: unknown) => T }): Promise<T | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

      // Ollama supports native JSON output via format: 'json'
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt + '\n\nRespond ONLY with valid JSON.',
          stream: false,
          format: 'json',
          options: {
            num_predict: this.maxTokens,
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) return null

      const data = await response.json() as { response?: string; thinking?: string }
      // Qwen3.5 models use 'thinking' field for structured output
      const text = data.response || data.thinking
      if (!text) return null

      const parsed = JSON.parse(text)
      return schema.parse(parsed)
    } catch (e) {
      console.error('Failed to parse Ollama JSON output:', (e as Error).message)
      return null
    }
  }

  /** Get current model name */
  getModel(): string { return this.model }

  /** Update model at runtime (from admin panel) */
  setModel(model: string): void { this.model = model }

  /** Get base URL */
  getBaseUrl(): string { return this.baseUrl }
}
