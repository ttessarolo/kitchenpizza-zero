/**
 * RuleEngine — Evaluates declarative rules from BreadScience JSON.
 *
 * Returns structured results with messageKey (never resolved text).
 * The client resolves messageKey → localized text via i18n.
 */

import type { RuleBlock, RuleCondition, RuleAction } from './types'

// ── Rule evaluation result ─────────────────────────────────────

export interface RuleResult {
  id: string
  category: string
  severity: 'info' | 'warning' | 'error'
  messageKey: string
  messageVars: Record<string, unknown>
  selectionMode: 'choose_one' | 'all'
  actions?: RuleAction[]
}

// ── Condition evaluation ───────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function evalCondition(cond: RuleCondition, ctx: Record<string, unknown>): boolean {
  const actual = getNestedValue(ctx, cond.field)
  let expected = cond.value

  // Allow referencing context values with underscore prefix
  if (typeof expected === 'string' && expected.startsWith('_')) {
    expected = getNestedValue(ctx, expected)
  }

  if (actual === undefined || actual === null) {
    return cond.op === 'eq' && (expected === undefined || expected === null)
  }

  switch (cond.op) {
    case 'eq': return actual === expected
    case 'neq': return actual !== expected
    case 'gt': return (actual as number) > (expected as number)
    case 'lt': return (actual as number) < (expected as number)
    case 'gte': return (actual as number) >= (expected as number)
    case 'lte': return (actual as number) <= (expected as number)
    case 'in': return Array.isArray(expected) && expected.includes(actual)
    case 'exists': return actual !== undefined && actual !== null
    default: return false
  }
}

// ── Main evaluation ────────────────────────────────────────────

/**
 * Evaluate a set of rules against a context.
 * Returns only rules whose conditions are met (and not excluded/suppressed).
 *
 * Results contain messageKey + messageVars (never resolved text).
 */
export function evaluateRules(
  rules: RuleBlock[],
  ctx: Record<string, unknown>,
): RuleResult[] {
  // Pass 1: determine which rules match
  const activeIds = new Set<string>()
  for (const rule of rules) {
    const conditionsMet = rule.conditions.every((c) => evalCondition(c, ctx))
    const excluded = rule.excludeIf?.some((c) => evalCondition(c, ctx)) ?? false
    if (conditionsMet && !excluded) {
      activeIds.add(rule.id)
    }
  }

  // Pass 2: apply suppressedBy and build results
  const results: RuleResult[] = []
  for (const rule of rules) {
    if (!activeIds.has(rule.id)) continue
    if (rule.suppressedBy?.some((id) => activeIds.has(id))) continue

    // Extract message variables from context
    const messageVars: Record<string, unknown> = {}
    if (rule.messageVars) {
      for (const varPath of rule.messageVars) {
        const value = getNestedValue(ctx, varPath)
        // Use the last segment of the path as the key (e.g., "ovenCfg.steamPct" → "steamPct")
        const key = varPath.includes('.') ? varPath.split('.').pop()! : varPath
        messageVars[key] = value
      }
    }

    results.push({
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      messageKey: rule.messageKey,
      messageVars,
      selectionMode: rule.selectionMode ?? 'all',
      actions: rule.actions,
    })
  }

  return results
}
