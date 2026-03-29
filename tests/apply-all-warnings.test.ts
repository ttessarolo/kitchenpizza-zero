/**
 * Test suite for apply-all-warnings logic and node red state management.
 *
 * Covers: buildCriticalWarningNodeIds behavior, dedup + apply-all integration,
 * and verification that resolved warnings clear node error state.
 */
import { describe, it, expect } from 'vitest'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import { deduplicateWarnings } from '@commons/utils/warning-dedup'

// ── Inline version of buildCriticalWarningNodeIds (copied from store for unit test) ──

function buildCriticalWarningNodeIds(warnings: ActionableWarning[]): Set<string> {
  const ids = new Set<string>()
  for (const w of warnings) {
    if (w.sourceNodeId && (w.severity === 'error' || w.severity === 'warning')) {
      ids.add(w.sourceNodeId)
    }
  }
  return ids
}

// ── Helpers ────────────────────────────────────────────────────────

function makeWarning(overrides: Partial<ActionableWarning> & { id: string; messageKey: string }): ActionableWarning {
  return {
    category: 'fermentation',
    severity: 'warning',
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════
// buildCriticalWarningNodeIds
// ═══════════════════════════════════════════════════════════════════

describe('buildCriticalWarningNodeIds', () => {
  it('extracts sourceNodeIds from error/warning severity', () => {
    const warnings: ActionableWarning[] = [
      makeWarning({ id: 'w1', messageKey: 'a', sourceNodeId: 'n1', severity: 'error' }),
      makeWarning({ id: 'w2', messageKey: 'b', sourceNodeId: 'n2', severity: 'warning' }),
      makeWarning({ id: 'w3', messageKey: 'c', sourceNodeId: 'n3', severity: 'info' }),
    ]
    const ids = buildCriticalWarningNodeIds(warnings)
    expect(ids.has('n1')).toBe(true)
    expect(ids.has('n2')).toBe(true)
    expect(ids.has('n3')).toBe(false) // info severity excluded
  })

  it('returns empty set when no warnings', () => {
    expect(buildCriticalWarningNodeIds([]).size).toBe(0)
  })

  it('returns empty set when warnings have no sourceNodeId', () => {
    const warnings: ActionableWarning[] = [
      makeWarning({ id: 'w1', messageKey: 'a', severity: 'error' }),
    ]
    expect(buildCriticalWarningNodeIds(warnings).size).toBe(0)
  })

  it('node red state clears when warnings are resolved', () => {
    // Before: 3 nodes have warning markers
    const warningsBefore: ActionableWarning[] = [
      makeWarning({ id: 'canonical', messageKey: 'warning.x' }),
      makeWarning({ id: 'marker_1', messageKey: 'warning.x', sourceNodeId: 'rise_1' }),
      makeWarning({ id: 'marker_2', messageKey: 'warning.x', sourceNodeId: 'rise_2' }),
      makeWarning({ id: 'marker_3', messageKey: 'warning.x', sourceNodeId: 'rise_3' }),
    ]
    const idsBefore = buildCriticalWarningNodeIds(warningsBefore)
    expect(idsBefore.size).toBe(3)

    // After: warnings resolved (reconciliation returns empty)
    const warningsAfter: ActionableWarning[] = []
    const idsAfter = buildCriticalWarningNodeIds(warningsAfter)
    expect(idsAfter.size).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Dedup + Apply All integration
// ═══════════════════════════════════════════════════════════════════

describe('dedup + apply-all integration', () => {
  it('deduplicated actionable warnings provide correct actions for apply-all', () => {
    const canonical1 = makeWarning({
      id: 'mismatch',
      messageKey: 'warning.total_fermentation_mismatch',
      actions: [{
        labelKey: 'action.sync_dough_hours',
        mutations: [{ type: 'updatePortioning', patch: { doughHours: 8 } }],
      }],
    })
    const canonical2 = makeWarning({
      id: 'yeast_mismatch',
      messageKey: 'warning.yeast_portioning_mismatch',
      actions: [{
        labelKey: 'action.sync_yeast_pct',
        mutations: [{ type: 'updatePortioning', patch: { yeastPct: 0.3 } }],
      }],
    })
    // Per-node markers (no actions)
    const markers = ['r1', 'r2', 'r3'].map((id) =>
      makeWarning({
        id: `marker_${id}`,
        messageKey: 'warning.total_fermentation_mismatch',
        sourceNodeId: id,
      }),
    )

    const all = [canonical1, ...markers, canonical2]
    const deduped = deduplicateWarnings(all)

    // Should have 2 deduped entries
    expect(deduped).toHaveLength(2)

    // Actionable ones
    const actionable = deduped.filter((w) => w.actions && w.actions.length > 0)
    expect(actionable).toHaveLength(2)

    // First has count=3 (3 per-node markers)
    const mismatch = deduped.find((w) => w.messageKey === 'warning.total_fermentation_mismatch')
    expect(mismatch!.count).toBe(3)
    expect(mismatch!.actions).toHaveLength(1)

    // Second has count=1 (no per-node markers)
    const yeast = deduped.find((w) => w.messageKey === 'warning.yeast_portioning_mismatch')
    expect(yeast!.count).toBe(1)
    expect(yeast!.actions).toHaveLength(1)

    // Simulate apply-all: collect action[0] from each actionable warning
    const allMutations = actionable.flatMap((w) => w.actions![0].mutations)
    expect(allMutations).toHaveLength(2)
    expect(allMutations[0]).toEqual({ type: 'updatePortioning', patch: { doughHours: 8 } })
    expect(allMutations[1]).toEqual({ type: 'updatePortioning', patch: { yeastPct: 0.3 } })
  })

  it('apply-all on empty actionable list is a no-op', () => {
    const nonActionable = [
      makeWarning({ id: 'info1', messageKey: 'warning.info', severity: 'info' }),
    ]
    const deduped = deduplicateWarnings(nonActionable)
    const actionable = deduped.filter((w) => w.actions && w.actions.length > 0)
    expect(actionable).toHaveLength(0)
    // No mutations to apply — no-op
  })
})
