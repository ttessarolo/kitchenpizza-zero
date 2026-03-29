/**
 * Test suite for warning deduplication logic.
 *
 * Covers: grouping by messageKey, count aggregation, affectedNodeIds,
 * severity promotion, canonical selection, and edge cases.
 */
import { describe, it, expect } from 'vitest'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import { deduplicateWarnings } from '@commons/utils/warning-dedup'

// ── Helpers ────────────────────────────────────────────────────────

function makeWarning(overrides: Partial<ActionableWarning> & { id: string; messageKey: string }): ActionableWarning {
  return {
    category: 'fermentation',
    severity: 'warning',
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════
// 1. Basic deduplication
// ═══════════════════════════════════════════════════════════════════

describe('deduplicateWarnings', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateWarnings([])).toEqual([])
  })

  it('single canonical warning → count 1, no affectedNodeIds', () => {
    const warnings: ActionableWarning[] = [
      makeWarning({ id: 'w1', messageKey: 'warning.test', severity: 'warning' }),
    ]
    const result = deduplicateWarnings(warnings)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(1)
    expect(result[0].affectedNodeIds).toEqual([])
    expect(result[0].messageKey).toBe('warning.test')
  })

  it('canonical + 5 per-node markers → 1 deduped entry with count=5', () => {
    const canonical = makeWarning({
      id: 'equiv_time',
      messageKey: 'warning.equivalent_time_exceeds_w_capacity',
      severity: 'warning',
      messageVars: { equivalentRoomHours: 14.75, maxHoursForW: 6, flourW: 290 },
      actions: [{ labelKey: 'action.use_stronger_flour', mutations: [] }],
    })
    const markers = Array.from({ length: 5 }, (_, i) =>
      makeWarning({
        id: `equiv_time_rise_${i}`,
        messageKey: 'warning.equivalent_time_exceeds_w_capacity',
        severity: 'warning',
        sourceNodeId: `rise_${i}`,
        messageVars: { equivalentRoomHours: 14.75, maxHoursForW: 6, flourW: 290 },
      }),
    )

    const result = deduplicateWarnings([canonical, ...markers])
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(5)
    expect(result[0].affectedNodeIds).toEqual(['rise_0', 'rise_1', 'rise_2', 'rise_3', 'rise_4'])
    expect(result[0].actions).toHaveLength(1)
    expect(result[0].id).toBe('equiv_time') // canonical's id
  })

  it('multiple distinct messageKeys → separate deduped entries', () => {
    const warnings: ActionableWarning[] = [
      makeWarning({ id: 'w1', messageKey: 'warning.yeast_too_low', severity: 'error' }),
      makeWarning({ id: 'w2', messageKey: 'warning.salt_high', severity: 'warning' }),
      makeWarning({ id: 'w3', messageKey: 'warning.fat_high', severity: 'info' }),
    ]
    const result = deduplicateWarnings(warnings)
    expect(result).toHaveLength(3)
    expect(result.map((r) => r.messageKey)).toEqual([
      'warning.yeast_too_low',
      'warning.salt_high',
      'warning.fat_high',
    ])
  })

  it('mixed actionable + non-actionable: actions preserved on actionable', () => {
    const actionable = makeWarning({
      id: 'w1',
      messageKey: 'warning.mismatch',
      actions: [{ labelKey: 'action.sync', mutations: [{ type: 'updatePortioning', patch: { doughHours: 8 } }] }],
    })
    const nonActionable = makeWarning({
      id: 'w2',
      messageKey: 'warning.info_only',
      severity: 'info',
    })
    const result = deduplicateWarnings([actionable, nonActionable])
    expect(result).toHaveLength(2)
    expect(result[0].actions).toHaveLength(1)
    expect(result[1].actions).toBeUndefined()
  })

  it('markers only (no canonical) → first used as representative', () => {
    const markers = Array.from({ length: 3 }, (_, i) =>
      makeWarning({
        id: `marker_${i}`,
        messageKey: 'warning.insufficient',
        severity: 'error',
        sourceNodeId: `node_${i}`,
      }),
    )
    const result = deduplicateWarnings(markers)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(3)
    expect(result[0].affectedNodeIds).toEqual(['node_0', 'node_1', 'node_2'])
    expect(result[0].actions).toBeUndefined()
    expect(result[0].id).toBe('marker_0') // first marker
  })

  it('same messageKey with mixed severity → picks highest', () => {
    const warnings: ActionableWarning[] = [
      makeWarning({ id: 'w1', messageKey: 'warning.test', severity: 'info' }),
      makeWarning({ id: 'w2', messageKey: 'warning.test', severity: 'error', sourceNodeId: 'n1' }),
      makeWarning({ id: 'w3', messageKey: 'warning.test', severity: 'warning', sourceNodeId: 'n2' }),
    ]
    const result = deduplicateWarnings(warnings)
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].count).toBe(2) // 2 sourceNodeIds
    expect(result[0].affectedNodeIds).toEqual(['n1', 'n2'])
  })

  it('does not deduplicate across different messageKeys even with same sourceNodeId', () => {
    const warnings: ActionableWarning[] = [
      makeWarning({ id: 'w1', messageKey: 'warning.a', sourceNodeId: 'n1' }),
      makeWarning({ id: 'w2', messageKey: 'warning.b', sourceNodeId: 'n1' }),
    ]
    const result = deduplicateWarnings(warnings)
    expect(result).toHaveLength(2)
  })

  it('preserves _ctx and messageVars from canonical', () => {
    const canonical = makeWarning({
      id: 'w1',
      messageKey: 'warning.test',
      messageVars: { hours: 14.75 },
      _ctx: { equivalentRoomHours: 14.75 },
      actions: [{ labelKey: 'action.fix', mutations: [] }],
    })
    const marker = makeWarning({
      id: 'w2',
      messageKey: 'warning.test',
      sourceNodeId: 'n1',
      messageVars: { hours: 14.75 },
    })
    const result = deduplicateWarnings([canonical, marker])
    expect(result[0].messageVars).toEqual({ hours: 14.75 })
    expect(result[0]._ctx).toEqual({ equivalentRoomHours: 14.75 })
  })
})
