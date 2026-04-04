import { llmService } from './llm-service'
import { getPromptTemplate, fillTemplate } from './prompt-store'
import { llmVerificationResultSchema } from '../../schemas/llm-verification'
import type { LlmVerificationResult } from '../../schemas/llm-verification'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import type { RecipeLayer } from '@commons/types/recipe-layers'
import type { RecipeMeta } from '@commons/types/recipe'
import type { DomainInfo } from '@commons/utils/science/types'
import { getDomainContextBuilder } from './domain-context-builders'

// Server-side i18n: static imports of translation files
import scienceEn from '@commons/i18n/en/science.json'
import scienceIt from '@commons/i18n/it/science.json'

type Dict = Record<string, string>
const scienceMessages: Record<string, Dict> = {
  en: scienceEn as Dict,
  it: scienceIt as Dict,
}

/**
 * Resolve an i18n messageKey to human-readable text server-side.
 * Falls back to EN if locale not found, then to messageKey itself.
 */
function resolveText(messageKey: string, messageVars: Record<string, unknown> | undefined, locale: string): string {
  const dict = scienceMessages[locale] ?? scienceMessages.en
  const template = dict[messageKey] ?? scienceMessages.en[messageKey]
  if (!template) return messageKey
  if (!messageVars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = messageVars[k]
    return v !== undefined && v !== null ? String(v) : ''
  })
}

/**
 * Build a rich warnings summary with resolved text, context values, and action descriptions.
 * This is domain-agnostic — it works for any warning type.
 */
function buildWarningsSummary(warnings: ActionableWarning[], locale: string): string {
  const seen = new Set<string>()
  return warnings
    .filter(w => {
      if (seen.has(w.messageKey)) return false
      seen.add(w.messageKey)
      return true
    })
    .map((w, i) => {
      const lines: string[] = []

      lines.push(`${i + 1}. [${w.severity}] warningId: "${w.messageKey}"`)

      const resolvedText = resolveText(w.messageKey, w.messageVars, locale)
      if (resolvedText !== w.messageKey) {
        lines.push(`   Text: "${resolvedText}"`)
      }

      if (w.messageVars && Object.keys(w.messageVars).length > 0) {
        const vars = Object.entries(w.messageVars)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}=${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`)
          .join(', ')
        if (vars) lines.push(`   Data: ${vars}`)
      }

      if (w.category) {
        lines.push(`   Category: ${w.category}`)
      }

      if (w.actions && w.actions.length > 0) {
        const actionLines = w.actions.map((a, j) => {
          const actionText = resolveText(a.labelKey, w.messageVars, locale)
          const actionDesc = resolveText(`${a.labelKey}.desc`, w.messageVars, locale)
          const descPart = actionDesc !== `${a.labelKey}.desc` ? ` — ${actionDesc}` : ''
          return `   [${j}] ${actionText}${descPart}`
        })
        lines.push(...actionLines)
      } else {
        lines.push('   (no suggested actions)')
      }

      return lines.join('\n')
    }).join('\n\n')
}

/**
 * Build a basic recipe summary line from layer + meta.
 */
function buildRecipeSummary(layer: RecipeLayer, meta: RecipeMeta): string {
  return `Recipe: ${meta.type}/${meta.subtype} (${meta.name || 'untitled'}), layer="${layer.name}" [${layer.type}/${layer.subtype}/${layer.variant}]`
}

/**
 * Run LLM verification on a reconciliation result.
 * Domain-aware: uses the domain's persona_system_prompt and
 * domain-specific context builders.
 * Returns null if LLM is unavailable or fails.
 */
export async function verifyReconciliation(
  layer: RecipeLayer,
  meta: RecipeMeta,
  warnings: ActionableWarning[],
  locale: string,
  domainInfo: DomainInfo | null,
): Promise<LlmVerificationResult | null> {
  if (warnings.length === 0) return null

  const template = getPromptTemplate('verify_reconciliation')
  if (!template) return null

  // Build domain-specific context
  const builder = getDomainContextBuilder(layer.type)
  const ctx = builder(layer)

  const prompt = fillTemplate(template, {
    recipeSummary: buildRecipeSummary(layer, meta),
    recipeType: meta.type,
    recipeSubtype: meta.subtype ?? '',
    domainKey: layer.type,
    globalValues: ctx.globalValues,
    processPhases: ctx.processPhases,
    supplementary: ctx.supplementary,
    warningsSummary: buildWarningsSummary(warnings, locale),
    locale,
  })

  // Use domain persona as system prompt if available
  const systemPrompt = domainInfo?.personaSystemPrompt ?? undefined

  const result = await llmService.generateJSON(prompt, llmVerificationResultSchema, { systemPrompt })
  if (!result) return null

  // Guardrail: filter out any 'error' severity insights (LLM can only add info/warning)
  result.additionalInsights = result.additionalInsights.filter(
    i => i.severity === 'info' || i.severity === 'warning'
  )

  // Guardrail: filter autoActions to only reference existing warnings with valid action indices
  result.autoActions = result.autoActions.filter(a => {
    const warning = warnings.find(w => w.id === a.warningId)
    if (!warning || !warning.actions) return false
    return a.actionIndex >= 0 && a.actionIndex < warning.actions.length
  })

  return result
}
