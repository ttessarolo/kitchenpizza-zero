import type { RecipeGraphEngine } from './recipe-graph-engine'
import { executeQuery } from './graph-query-dsl'
import type { GraphQuery } from './graph-query-dsl'
import type { ActionableWarning, WarningAction } from '@commons/types/recipe-graph'

// ── Types ────────────────────────────────────────────────────────

/**
 * Rule with optional graph query.
 * Standard rules have `conditions` array.
 * Graph-aware rules additionally have `graphQuery`.
 */
export interface GraphAwareRule {
  id: string
  domain: string
  severity: 'info' | 'warning' | 'error'
  messageKey: string
  messageVars?: Record<string, unknown>
  conditions?: Array<{ field: string; op: string; value: unknown }>
  graphQuery?: GraphQuery
  actions?: WarningAction[]
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Resolve a dot-notated field path from a context object.
 * E.g. 'node.data.baseDur' → ctx.node.data.baseDur
 */
function getField(ctx: Record<string, unknown>, field: string): unknown {
  const parts = field.split('.')
  let current: unknown = ctx
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Evaluate a single condition against a context object.
 */
function evalCondition(
  ctx: Record<string, unknown>,
  condition: { field: string; op: string; value: unknown },
): boolean {
  const actual = getField(ctx, condition.field)
  const expected = condition.value

  switch (condition.op) {
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected
    case 'in':
      return Array.isArray(expected) && expected.includes(actual)
    case 'exists':
      return actual != null
    default:
      return false
  }
}

// ── Main ─────────────────────────────────────────────────────────

/**
 * Evaluate graph-aware rules against a RecipeGraphEngine.
 * Returns warnings for rules where:
 * 1. All conditions match the context (if conditions present)
 * 2. The graphQuery finds matches (if graphQuery present)
 */
export function evaluateGraphRules(
  engine: RecipeGraphEngine,
  rules: GraphAwareRule[],
  ctx: Record<string, unknown>,
): ActionableWarning[] {
  const warnings: ActionableWarning[] = []

  for (const rule of rules) {
    // 1. Evaluate conditions against ctx
    if (rule.conditions && rule.conditions.length > 0) {
      const allPass = rule.conditions.every((c) => evalCondition(ctx, c))
      if (!allPass) continue
    }

    // 2. Execute graph query if present
    let firstMatchedNodeId: string | undefined
    let queryContext: Record<string, unknown> = {}

    if (rule.graphQuery) {
      const result = executeQuery(engine, rule.graphQuery)
      if (result.matchCount === 0) continue

      // Extract first matched node id for sourceNodeId
      if (result.nodes && result.nodes.length > 0) {
        firstMatchedNodeId = result.nodes[0]
      }

      queryContext = {
        matchCount: result.matchCount,
        ...(result.value != null ? { aggregatedValue: result.value } : {}),
      }
    }

    // 3. Emit warning
    warnings.push({
      id: rule.id,
      category: rule.domain as ActionableWarning['category'],
      severity: rule.severity,
      messageKey: rule.messageKey,
      messageVars: {
        ...rule.messageVars,
        ...queryContext,
      },
      actions: rule.actions,
      ...(firstMatchedNodeId ? { sourceNodeId: firstMatchedNodeId } : {}),
    })
  }

  return warnings
}
