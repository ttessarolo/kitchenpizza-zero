/**
 * HuggingFace Inference API provider.
 * Uses the HF serverless inference API for text generation.
 * Model: Qwen3-0.6B (or configurable via env).
 */
import type { LlmProvider } from './noop-provider'

export class HfApiProvider implements LlmProvider {
  private apiToken: string
  private modelId: string
  private maxTokens: number
  private timeoutMs: number

  constructor() {
    this.apiToken = process.env.HF_API_TOKEN || ''
    this.modelId = process.env.HF_MODEL_ID || 'Qwen/Qwen3-0.6B'
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '512', 10)
    this.timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10)
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiToken
  }

  async generate(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string | null> {
    if (!this.apiToken) return null
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.modelId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: options?.maxTokens ?? this.maxTokens,
              temperature: options?.temperature ?? 0.3,
              return_full_text: false,
            },
          }),
          signal: controller.signal,
        },
      )
      clearTimeout(timeout)

      if (!response.ok) {
        console.error(
          `HF API error: ${response.status} ${response.statusText}`,
        )
        return null
      }

      const data = await response.json()
      // HF API returns [{ generated_text: "..." }]
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text
      }
      return null
    } catch (e) {
      console.error('HF API error:', (e as Error).message)
      return null
    }
  }

  async generateJSON<T>(
    prompt: string,
    schema: { parse: (v: unknown) => T },
  ): Promise<T | null> {
    const text = await this.generate(
      prompt + '\n\nRespond ONLY with valid JSON, no markdown.',
      { temperature: 0.1 },
    )
    if (!text) return null
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch =
        text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text
      const parsed = JSON.parse(jsonStr)
      return schema.parse(parsed)
    } catch {
      console.error('Failed to parse LLM JSON output')
      return null
    }
  }
}
