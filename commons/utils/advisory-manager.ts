/**
 * Advisory Manager — data-driven rule engine for recipe warnings.
 *
 * All advisories are evaluated from declarative rules (advisory-rules.ts).
 * Supports: conditions (AND), excludeIf (blacklist), suppressedBy (priority).
 */

import type { ActionableWarning, WarningAction, NodeData } from '@commons/types/recipe-graph'
import type { OvenConfig } from '@commons/types/recipe'

// ── Context passed to rule evaluation ───────────────────────────

export interface AdvisoryContext {
  nodeId?: string
  nodeType: string
  nodeSubtype: string | null
  nodeData: NodeData
  ovenCfg?: OvenConfig | null
  recipeType: string
  recipeSubtype: string | null
  baseDur: number
  totalFlour: number
  yeastPct: number
  saltPct: number
  fatPct: number
  hydration: number
  flourW: number
  // Baking profile computed values (injected by caller)
  _tempMin?: number
  _tempMax?: number
  _suggestedTemp?: number
  _cieloMin?: number
  _cieloMax?: number
  _recommendedModes?: string[]
  _isPrecottura?: boolean
  [key: string]: unknown
}

// ── Rule definition ─────────────────────────────────────────────

export interface AdvisoryCondition {
  field: string
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'exists'
  value: unknown
}

export interface AdvisoryRule {
  id: string
  category: string
  severity: 'info' | 'warning' | 'error'
  message: string | ((ctx: AdvisoryContext) => string)
  conditions: AdvisoryCondition[]
  excludeIf?: AdvisoryCondition[]
  suppressedBy?: string[]
  actions?: WarningAction[] | ((ctx: AdvisoryContext) => WarningAction[])
}

// ── Condition evaluator ─────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function evalCondition(cond: AdvisoryCondition, ctx: AdvisoryContext): boolean {
  const actual = getNestedValue(ctx as unknown as Record<string, unknown>, cond.field)
  let expected = cond.value

  // Allow referencing ctx values with underscore prefix
  if (typeof expected === 'string' && expected.startsWith('_')) {
    expected = getNestedValue(ctx as unknown as Record<string, unknown>, expected)
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

// ── Main evaluation function ────────────────────────────────────

export function evaluateAdvisories(
  ctx: AdvisoryContext,
  rules: AdvisoryRule[],
): ActionableWarning[] {
  // Pass 1: determine which rules' conditions are met
  const activeIds = new Set<string>()
  for (const rule of rules) {
    const conditionsMet = rule.conditions.every((c) => evalCondition(c, ctx))
    const excluded = rule.excludeIf?.some((c) => evalCondition(c, ctx)) ?? false
    if (conditionsMet && !excluded) {
      activeIds.add(rule.id)
    }
  }

  // Pass 2: apply suppressedBy and build results
  const results: ActionableWarning[] = []
  for (const rule of rules) {
    if (!activeIds.has(rule.id)) continue
    if (rule.suppressedBy?.some((id) => activeIds.has(id))) continue

    results.push({
      id: rule.id,
      sourceNodeId: ctx.nodeId,
      category: rule.category as ActionableWarning['category'],
      severity: rule.severity,
      message: typeof rule.message === 'function' ? rule.message(ctx) : rule.message,
      actions: typeof rule.actions === 'function' ? rule.actions(ctx) : rule.actions,
    })
  }

  return results
}
