/**
 * Warning Deduplication — pure UI-layer transform.
 *
 * Groups ActionableWarning[] by messageKey so the composition panel
 * shows one card per unique warning with a count badge (e.g., "×5 nodi").
 *
 * The raw warnings[] in the store remain unchanged — per-node markers
 * are still used by buildCriticalWarningNodeIds() for red node highlighting.
 */

import type { ActionableWarning, DedupedWarning } from '@commons/types/recipe-graph'

const SEVERITY_RANK: Record<string, number> = { error: 3, warning: 2, info: 1 }

/**
 * Deduplicate warnings for UI display.
 *
 * Algorithm:
 * 1. Group by messageKey
 * 2. Pick the canonical (no sourceNodeId, has actions) as representative
 * 3. Collect all sourceNodeIds from the group
 * 4. Pick highest severity across the group
 */
export function deduplicateWarnings(warnings: ActionableWarning[]): DedupedWarning[] {
  if (warnings.length === 0) return []

  const groups = new Map<string, ActionableWarning[]>()
  for (const w of warnings) {
    const key = w.messageKey
    const list = groups.get(key)
    if (list) list.push(w)
    else groups.set(key, [w])
  }

  const result: DedupedWarning[] = []
  for (const [, group] of groups) {
    // Pick canonical: prefer the one without sourceNodeId (and with actions)
    const canonical = group.find((w) => !w.sourceNodeId && w.actions?.length) ?? group[0]

    // Collect all distinct sourceNodeIds
    const affectedNodeIds: string[] = []
    for (const w of group) {
      if (w.sourceNodeId && !affectedNodeIds.includes(w.sourceNodeId)) {
        affectedNodeIds.push(w.sourceNodeId)
      }
    }

    // Pick highest severity
    let highestSeverity = canonical.severity
    for (const w of group) {
      if ((SEVERITY_RANK[w.severity] ?? 0) > (SEVERITY_RANK[highestSeverity] ?? 0)) {
        highestSeverity = w.severity
      }
    }

    result.push({
      ...canonical,
      severity: highestSeverity,
      count: Math.max(affectedNodeIds.length, 1),
      affectedNodeIds,
    })
  }

  return result
}
