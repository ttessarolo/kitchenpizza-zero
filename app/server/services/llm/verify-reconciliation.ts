import { llmService } from './llm-service'
import { getPromptTemplate, fillTemplate } from './prompt-store'
import { llmVerificationResultSchema } from '../../schemas/llm-verification'
import type { LlmVerificationResult } from '../../schemas/llm-verification'
import type { RecipeGraph, ActionableWarning } from '@commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '@commons/types/recipe'

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
 * Build a structured recipe summary with all key data points.
 */
function buildRecipeSummary(
  graph: RecipeGraph,
  portioning: Portioning,
  meta: RecipeMeta,
): string {
  const lines: string[] = []

  // Basic recipe identity
  lines.push(`Recipe: ${meta.type}/${meta.subtype} (${meta.name || 'untitled'})`)

  // Portioning — all key numbers
  lines.push(`Portioning: mode=${portioning.mode}, hyd=${portioning.targetHyd}%, yeast=${portioning.yeastPct}%, salt=${portioning.saltPct}%, fat=${portioning.fatPct}%`)
  lines.push(`Dough hours: ${portioning.doughHours}h`)
  if (portioning.preImpasto) lines.push(`Pre-technique: ${portioning.preImpasto}`)
  if (portioning.preFermento) lines.push(`Pre-ferment: ${portioning.preFermento}`)

  // Rise phases — detailed breakdown
  const riseNodes = graph.nodes.filter(n => n.type === 'rise')
  if (riseNodes.length > 0) {
    lines.push(`Rise phases (${riseNodes.length}):`)
    for (const n of riseNodes) {
      const d = n.data as Record<string, unknown>
      const method = d.riseMethod ?? 'unknown'
      const dur = d.baseDur as number ?? 0
      const durH = Math.round(dur / 60 * 10) / 10
      const override = d.userOverrideDuration ? ' [user override]' : ''
      lines.push(`  - "${d.title}": ${method}, ${durH}h (${dur} min)${override}`)
    }
  }

  // Bake/cooking phases
  const bakeNodes = graph.nodes.filter(n => n.type === 'bake')
  if (bakeNodes.length > 0) {
    lines.push(`Cooking phases (${bakeNodes.length}):`)
    for (const n of bakeNodes) {
      const d = n.data as Record<string, unknown>
      const cfg = d.cookingCfg as Record<string, unknown> | null
      const method = cfg?.method ?? 'unknown'
      const dur = d.baseDur as number ?? 0
      const innerCfg = cfg?.cfg as Record<string, unknown> | null
      const temp = innerCfg?.temp ?? (d.ovenCfg as Record<string, unknown> | null)?.temp ?? '?'
      lines.push(`  - "${d.title}": ${method}, ${dur} min, ${temp}°C`)
    }
  }

  // Dough/mix nodes — ingredient overview
  const doughNodes = graph.nodes.filter(n => n.type === 'dough' || n.type === 'mix')
  if (doughNodes.length > 0) {
    for (const n of doughNodes) {
      const d = n.data as Record<string, unknown>
      const flours = d.flours as Array<Record<string, unknown>> | undefined
      if (flours && flours.length > 0) {
        const flourDesc = flours.map(f => `${f.type ?? f.id}(${f.g ?? 0}g)`).join(', ')
        lines.push(`Dough "${d.title}": flours=[${flourDesc}]`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Build structured flour blend info from dough nodes.
 */
function buildFlourBlendInfo(graph: RecipeGraph): string {
  const doughNodes = graph.nodes.filter(n => n.type === 'dough' || n.type === 'mix')
  if (doughNodes.length === 0) return 'No flour blend data available'

  const lines: string[] = []
  for (const n of doughNodes) {
    const data = n.data as Record<string, unknown>
    const flourBlend = data.flourBlend as Array<{ flourId?: string; pct?: number; w?: number; protein?: number }> | undefined
    if (!flourBlend || flourBlend.length === 0) {
      // Fallback: try to get W from flours array
      const flours = data.flours as Array<Record<string, unknown>> | undefined
      if (flours && flours.length > 0) {
        lines.push(`${n.id}: ${flours.length} flours (no W data available in blend)`)
      } else {
        lines.push(`${n.id}: no flour data`)
      }
      continue
    }
    for (const f of flourBlend) {
      lines.push(`${n.id}: ${f.flourId ?? 'unknown'} ${f.pct ?? 0}% — W${f.w ?? '?'}${f.protein ? `, protein ${f.protein}%` : ''}`)
    }
    // Compute weighted average W
    const totalPct = flourBlend.reduce((a, f) => a + (f.pct ?? 0), 0)
    if (totalPct > 0) {
      const avgW = flourBlend.reduce((a, f) => a + (f.w ?? 0) * (f.pct ?? 0), 0) / totalPct
      lines.push(`${n.id}: blend average W = ${Math.round(avgW)}`)
    }
  }

  return lines.join('\n') || 'No flour blend data available'
}

/**
 * Extract average flour W from dough nodes.
 */
function extractFlourW(graph: RecipeGraph): string {
  const doughNodes = graph.nodes.filter(n => n.type === 'dough' || n.type === 'mix')
  for (const n of doughNodes) {
    const data = n.data as Record<string, unknown>
    const flourBlend = data.flourBlend as Array<{ w?: number; pct?: number }> | undefined
    if (flourBlend && flourBlend.length > 0) {
      const totalPct = flourBlend.reduce((a, f) => a + (f.pct ?? 0), 0)
      if (totalPct > 0) {
        const weightedW = flourBlend.reduce((a, f) => a + (f.w ?? 0) * (f.pct ?? 0), 0) / totalPct
        return String(Math.round(weightedW))
      }
    }
    if (typeof data.flourW === 'number') return String(data.flourW)
  }
  return 'N/A'
}

/**
 * Build a rich warnings summary with resolved text, context values, and action descriptions.
 * This is the KEY function — it determines what the LLM knows about each warning.
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

      // Warning header with severity and ID
      lines.push(`${i + 1}. [${w.severity}] warningId: "${w.messageKey}"`)

      // Resolved human-readable text — this tells the LLM WHAT the warning says
      const resolvedText = resolveText(w.messageKey, w.messageVars, locale)
      if (resolvedText !== w.messageKey) {
        lines.push(`   Text: "${resolvedText}"`)
      }

      // Raw messageVars — gives the LLM the actual numbers to reason about
      if (w.messageVars && Object.keys(w.messageVars).length > 0) {
        const vars = Object.entries(w.messageVars)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}=${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`)
          .join(', ')
        if (vars) lines.push(`   Data: ${vars}`)
      }

      // Category for context
      if (w.category) {
        lines.push(`   Category: ${w.category}`)
      }

      // Actions with resolved descriptions
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
    flourW: extractFlourW(graph),
    doughHours: String(portioning.doughHours),
    nodeDetails: buildNodeDetails(graph),
    flourBlendInfo: buildFlourBlendInfo(graph),
    warningsSummary: buildWarningsSummary(warnings, locale),
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

/**
 * Build node details — focused on decision-relevant fields, not raw data dump.
 */
function buildNodeDetails(graph: RecipeGraph): string {
  return graph.nodes.map(n => {
    const d = n.data as Record<string, unknown>
    const parts: string[] = [`[${n.type}] "${d.title}"`]

    // Duration is always relevant
    if (typeof d.baseDur === 'number') {
      const durH = Math.round(d.baseDur / 60 * 10) / 10
      parts.push(`dur=${durH}h (${d.baseDur}min)`)
    }

    // Type-specific key fields
    if (n.type === 'rise') {
      if (d.riseMethod) parts.push(`method=${d.riseMethod}`)
      if (d.userOverrideDuration) parts.push('userOverride=true')
    } else if (n.type === 'bake') {
      const cfg = d.cookingCfg as Record<string, unknown> | null
      if (cfg) {
        parts.push(`cookMethod=${cfg.method}`)
        const inner = cfg.cfg as Record<string, unknown> | null
        if (inner?.temp) parts.push(`temp=${inner.temp}°C`)
        if (inner?.ovenMode) parts.push(`mode=${inner.ovenMode}`)
        if (inner?.steamPct) parts.push(`steam=${inner.steamPct}%`)
      }
    } else if (n.type === 'dough' || n.type === 'mix') {
      if (d.kneadMethod) parts.push(`knead=${d.kneadMethod}`)
      const flours = d.flours as Array<Record<string, unknown>> | undefined
      if (flours) parts.push(`${flours.length} flours`)
    } else if (n.type === 'shape') {
      if (d.shapeCount) parts.push(`count=${d.shapeCount}`)
    } else if (n.type === 'pre_ferment') {
      const pfCfg = d.preFermentCfg as Record<string, unknown> | null
      if (pfCfg) {
        parts.push(`type=${pfCfg.type}`)
        if (pfCfg.pct) parts.push(`pct=${pfCfg.pct}%`)
        if (pfCfg.hydration) parts.push(`hyd=${pfCfg.hydration}%`)
      }
    }

    return `- ${parts.join(', ')}`
  }).join('\n')
}
