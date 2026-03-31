import { llmService } from './llm-service'
import { getPromptTemplate, fillTemplate } from './prompt-store'
import { llmVerificationResultSchema } from '../../schemas/llm-verification'
import type { LlmVerificationResult } from '../../schemas/llm-verification'
import type { RecipeGraph, ActionableWarning } from '@commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '@commons/types/recipe'

/**
 * Build a concise summary of the reconciliation result for the LLM.
 * The full graph is too large for a 0.8B model — we send key metrics only.
 */
function buildRecipeSummary(
  graph: RecipeGraph,
  _portioning: Portioning,
  meta: RecipeMeta,
): string {
  const nodeCount = graph.nodes.length
  const riseNodes = graph.nodes.filter(n => n.type === 'rise')
  const totalRiseMin = riseNodes.reduce((a, n) => a + ((n.data as Record<string, unknown>).baseDur as number || 0), 0)

  return `${meta.type}/${meta.subtype}, ${nodeCount} nodes, total rise ${Math.round(totalRiseMin / 60)}h, ${riseNodes.length} rise phases`
}

/**
 * Build a concise warnings summary for the LLM.
 */
function buildWarningsSummary(warnings: ActionableWarning[]): string {
  return warnings.map((w, i) => {
    const actions = w.actions?.map((a, j) => `  [${j}] ${a.labelKey}`).join('\n') ?? '  (no actions)'
    return `${i + 1}. [${w.severity}] ${w.messageKey} (id: ${w.id})\n${actions}`
  }).join('\n')
}

/**
 * Run LLM verification on a reconciliation result.
 * Returns null if LLM is unavailable or fails.
 */
export async function verifyReconciliation(
  graph: RecipeGraph,
  portioning: Portioning,
  meta: RecipeMeta,
  warnings: ActionableWarning[],
  locale: string,
): Promise<LlmVerificationResult | null> {
  // Skip if no warnings to verify
  if (warnings.length === 0) return null

  const template = getPromptTemplate('verify_reconciliation')
  if (!template) return null

  const prompt = fillTemplate(template, {
    recipeSummary: buildRecipeSummary(graph, portioning, meta),
    recipeType: meta.type,
    recipeSubtype: meta.subtype ?? '',
    hydration: String(portioning.targetHyd),
    yeastPct: String(portioning.yeastPct),
    saltPct: String(portioning.saltPct),
    flourW: '280', // TODO: extract from dough node flour blend
    doughHours: String(portioning.doughHours),
    warningsSummary: buildWarningsSummary(warnings),
    locale,
  })

  const result = await llmService.generateJSON(prompt, llmVerificationResultSchema)
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
