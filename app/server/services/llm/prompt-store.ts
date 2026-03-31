import { LLM_PROMPTS, DEFAULT_TEMPLATES, type LlmPromptEntry } from '../../../../local_data/llm-prompts'

/**
 * Prompt store — reads/writes LLM prompt templates.
 * Today: in-memory from local_data (mutable array).
 * Tomorrow: same interface backed by DB.
 */

export function getPrompt(key: string): LlmPromptEntry | null {
  return LLM_PROMPTS.find(p => p.key === key) ?? null
}

export function getPromptTemplate(key: string): string {
  return getPrompt(key)?.template ?? ''
}

export function getAllPrompts(): LlmPromptEntry[] {
  return [...LLM_PROMPTS]
}

export function getPromptsByCategory(category: string): LlmPromptEntry[] {
  return LLM_PROMPTS.filter(p => p.category === category)
}

export function updatePrompt(key: string, template: string): LlmPromptEntry | null {
  const entry = LLM_PROMPTS.find(p => p.key === key)
  if (!entry) return null
  entry.template = template
  entry.lastModified = new Date().toISOString().split('T')[0]
  return { ...entry }
}

export function resetPrompt(key: string): LlmPromptEntry | null {
  const entry = LLM_PROMPTS.find(p => p.key === key)
  if (!entry) return null
  const defaultTemplate = DEFAULT_TEMPLATES[key]
  if (!defaultTemplate) return null
  entry.template = defaultTemplate
  entry.lastModified = new Date().toISOString().split('T')[0]
  return { ...entry }
}

/** Fill {{variables}} in a template */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}
