import OpenAI from 'openai'
import type { LlmProvider, LlmGenerateOptions } from './noop-provider'

const DEFAULT_SYSTEM_PROMPT = 'You are a culinary science expert.'

/**
 * OpenAiProvider — connects to OpenAI API (gpt-5.4-mini).
 * Uses the official OpenAI SDK for auth, retries, and structured output.
 */
export class OpenAiProvider implements LlmProvider {
  private client: OpenAI
  private model: string
  private maxTokens: number
  private timeoutMs: number

  constructor(config?: { apiKey?: string; model?: string; maxTokens?: number; timeoutMs?: number }) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || ''
    this.model = config?.model || process.env.OPENAI_MODEL || 'gpt-5.4-mini'
    this.maxTokens = config?.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || '4096', 10)
    this.timeoutMs = config?.timeoutMs || parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10)

    this.client = new OpenAI({
      apiKey,
      timeout: this.timeoutMs,
    })
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.retrieve(this.model)
      return true
    } catch {
      return false
    }
  }

  async generate(
    prompt: string,
    options?: LlmGenerateOptions,
  ): Promise<string | null> {
    try {
      const systemContent = options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: options?.maxTokens ?? this.maxTokens,
        temperature: options?.temperature ?? 0.3,
      })

      return response.choices[0]?.message?.content || null
    } catch (e) {
      console.error('OpenAI API error:', (e as Error).message)
      return null
    }
  }

  async generateJSON<T>(
    prompt: string,
    schema: { parse: (v: unknown) => T },
    options?: LlmGenerateOptions,
  ): Promise<T | null> {
    try {
      const basePrompt = options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
      const systemContent = `${basePrompt} Respond ONLY with valid JSON.`
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: options?.maxTokens ?? this.maxTokens,
        temperature: options?.temperature ?? 0.1,
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content
      if (!content) return null

      const parsed = JSON.parse(content)
      return schema.parse(parsed)
    } catch (e) {
      console.error('Failed to parse OpenAI JSON output:', (e as Error).message)
      return null
    }
  }

  /** Get current model name */
  getModel(): string {
    return this.model
  }
}
