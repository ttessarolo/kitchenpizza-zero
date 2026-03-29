/**
 * RecipeAutoCorrectManager — Iterative constraint solver for recipe graphs.
 *
 * Analyzes warnings from reconcileGraph(), prioritizes fixes by scientific tier,
 * applies them iteratively, verifies improvement after each step, and produces
 * a structured report.
 *
 * The solver understands that warnings are interdependent:
 * - Tier 1 (STRUCTURAL): flour_w_max_rise, equivalent_time_exceeds_w_capacity
 *   → These set ceiling/floor on fermentation hours. Fix FIRST.
 * - Tier 2 (SYNC): total_fermentation_mismatch, yeast_portioning_mismatch
 *   → Downstream of Tier 1. Often auto-resolved when Tier 1 is fixed.
 * - Tier 3 (SEQUENCE): cold_rise_too_long, acclimatization_missing
 *   → Independent, fix after Tier 1+2.
 * - Tier 4 (COMPOSITION): salt, fat, hydration, yeast range warnings
 *   → Independent, fix in any order.
 *
 * Scientific references:
 * - [C] Casucci Cap. 39 — W determines yeast speed & max fermentation window
 * - [C] Casucci Cap. 44 — Formula L: yeast% = K / (hyd × tempC² × hours)
 * - [C] Casucci Cap. 31 — Cold fermentation kinetic limits (~72h max)
 */

import type { RecipeGraph, ActionableWarning } from '@commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '@commons/types/recipe'
import type { ScienceProvider } from './science/science-provider'
import type {
  AutoCorrectConfig,
  AutoCorrectStep,
  AutoCorrectReport,
  AutoCorrectResult,
} from '@commons/types/auto-correct'
import { reconcileGraph } from '../../app/server/services/graph-reconciler.service'
import { applyWarningActionPure } from './graph-mutation-engine'

// ── Warning Tier Classification ─────────────────────────────────

const TIER_PREFIXES: [string, number][] = [
  // Tier 1: PER-NODE STRUCTURAL — fix individual rise node durations first
  ['flour_w_', 1],
  // Tier 2: GRAPH-LEVEL STRUCTURAL — aggregate constraints
  ['equivalent_time_exceeds', 2],
  ['rise_phases_insufficient', 2],
  // Tier 3: SYNC — portioning alignment (often auto-resolved by Tier 1-2)
  ['total_fermentation_mismatch', 3],
  ['yeast_portioning_mismatch', 3],
  // Tier 4: SEQUENCE — node ordering
  ['cold_rise_too_long', 4],
  ['acclimatization_missing', 4],
  // Tier 5 is default for composition warnings
]

function getWarningTier(warningId: string): number {
  for (const [prefix, tier] of TIER_PREFIXES) {
    if (warningId.startsWith(prefix)) return tier
  }
  return 4
}

// ── Helpers ──────────────────────────────────────────────────────

const MAX_ROUNDS: Record<string, number> = { low: 3, medium: 5, high: 8 }

/**
 * Count actionable warnings (all IDs, not just unique messageKeys).
 * This ensures that fixing one of N per-node warnings is recognized as improvement.
 */
function countActionable(warnings: ActionableWarning[]): number {
  return warnings.filter((w) => w.actions?.length).length
}

/**
 * Get actionable, non-skipped warnings — deduplicated by messageKey.
 * Prefers canonical (no sourceNodeId) over per-node markers.
 */
function getActionableCanonical(
  warnings: ActionableWarning[],
  skippedIds: Set<string>,
): ActionableWarning[] {
  const seen = new Set<string>()
  const result: ActionableWarning[] = []

  // First pass: collect canonical warnings (no sourceNodeId)
  for (const w of warnings) {
    if (!w.actions?.length) continue
    if (skippedIds.has(w.id)) continue
    if (!w.sourceNodeId && !seen.has(w.messageKey)) {
      seen.add(w.messageKey)
      result.push(w)
    }
  }

  // Second pass: fill in warnings that only have sourceNodeId (e.g., flour_w_max_rise)
  for (const w of warnings) {
    if (!w.actions?.length) continue
    if (skippedIds.has(w.id)) continue
    if (!seen.has(w.messageKey)) {
      seen.add(w.messageKey)
      result.push(w)
    }
  }

  return result
}

/**
 * Deep clone a plain object (safe for graph/portioning — no functions, no circular refs).
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// ── Core Algorithm ──────────────────────────────────────────────

/**
 * Iterative constraint solver for recipe graph auto-correction.
 *
 * @param provider - Science provider for rule evaluation
 * @param graph - Current recipe graph
 * @param portioning - Current portioning settings
 * @param meta - Recipe metadata (type, subtype)
 * @param config - Auto-correction configuration
 * @returns Updated graph + portioning + structured report
 */
export function autoCorrectGraph(
  provider: ScienceProvider,
  graph: RecipeGraph,
  portioning: Portioning,
  meta: RecipeMeta,
  config: AutoCorrectConfig,
): AutoCorrectResult {
  const maxRounds = MAX_ROUNDS[config.reasoningLevel] ?? 5
  const steps: AutoCorrectStep[] = []
  const skippedIds = new Set<string>()
  let currentGraph = deepClone(graph)
  let currentPortioning = deepClone(portioning)

  for (let round = 1; round <= maxRounds; round++) {
    const result = reconcileGraph(currentGraph, currentPortioning, meta, provider)
    const actionable = getActionableCanonical(result.warnings, skippedIds)

    if (actionable.length === 0) break

    // Sort by tier → highest priority first
    actionable.sort((a, b) => getWarningTier(a.id) - getWarningTier(b.id))
    const top = actionable[0]
    const topAction = top.actions![0]

    if (!config.autoCorrect) {
      // Analysis mode: record what WOULD be done, skip to next
      steps.push({
        round,
        warningId: top.id,
        messageKey: top.messageKey,
        messageVars: top.messageVars,
        actionLabelKey: topAction.labelKey,
        outcome: 'applied',
        warningsBefore: countActionable(result.warnings),
        warningsAfter: 0,
      })
      skippedIds.add(top.id)
      continue
    }

    // Apply the fix
    const beforeCount = countActionable(result.warnings)
    const { graph: newGraph, portioning: newPort } = applyWarningActionPure(
      top, 0, currentGraph, currentPortioning,
    )

    // Verify improvement
    const newResult = reconcileGraph(newGraph, newPort, meta, provider)
    const afterCount = countActionable(newResult.warnings)

    if (afterCount >= beforeCount) {
      // No improvement → skip
      skippedIds.add(top.id)
      steps.push({
        round,
        warningId: top.id,
        messageKey: top.messageKey,
        messageVars: top.messageVars,
        actionLabelKey: topAction.labelKey,
        outcome: 'skipped',
        reason: 'no_improvement',
        warningsBefore: beforeCount,
        warningsAfter: afterCount,
      })
      continue
    }

    // Commit improvement
    currentGraph = newGraph
    currentPortioning = newPort
    steps.push({
      round,
      warningId: top.id,
      messageKey: top.messageKey,
      messageVars: top.messageVars,
      actionLabelKey: topAction.labelKey,
      outcome: 'applied',
      warningsBefore: beforeCount,
      warningsAfter: afterCount,
    })
  }

  // Final reconciliation
  const finalResult = reconcileGraph(currentGraph, currentPortioning, meta, provider)
  const remaining = getActionableCanonical(finalResult.warnings, skippedIds)

  return {
    graph: currentGraph,
    portioning: currentPortioning,
    report: {
      status: remaining.length === 0 ? 'ok' : 'ko',
      steps,
      warningsResolved: steps
        .filter((s) => s.outcome === 'applied')
        .reduce((a, s) => a + Math.max(0, s.warningsBefore - s.warningsAfter), 0),
      warningsRemaining: finalResult.warnings,
      roundsUsed: steps.length,
      maxRounds,
    },
  }
}
