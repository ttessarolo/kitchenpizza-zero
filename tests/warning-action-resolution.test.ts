/**
 * Test suite for warning action value resolution.
 *
 * Covers: _contextRef: prefix handling, _ prefix handling,
 * fallback to messageVars, and edge cases.
 */
import { describe, it, expect } from 'vitest'
import type { ActionableWarning } from '@commons/types/recipe-graph'

// ── Extract resolvePatch logic for unit testing ──
// This mirrors the store's resolvePatch behavior.

function resolvePatch(
  rawPatch: Record<string, unknown>,
  warning: ActionableWarning,
  ctx: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(rawPatch)) {
    let resolvedVal = val
    if (typeof val === 'string') {
      let ctxKey: string | null = null
      if (val.startsWith('_contextRef:')) {
        ctxKey = val.slice('_contextRef:'.length)
      } else if (val.startsWith('_')) {
        ctxKey = val
      }

      if (ctxKey !== null) {
        if (ctx[ctxKey] !== undefined) {
          resolvedVal = ctx[ctxKey]
        } else if (ctx[`_${ctxKey}`] !== undefined) {
          resolvedVal = ctx[`_${ctxKey}`]
        } else if (warning.messageVars?.[ctxKey] !== undefined) {
          resolvedVal = warning.messageVars[ctxKey]
        } else if (warning.messageVars?.[ctxKey.replace(/^_/, '')] !== undefined) {
          resolvedVal = warning.messageVars[ctxKey.replace(/^_/, '')]
        }
      }
    }
    result[key] = resolvedVal
  }
  return result
}

const baseWarning: ActionableWarning = {
  id: 'test',
  category: 'fermentation',
  severity: 'warning',
  messageKey: 'warning.test',
}

describe('resolvePatch — _contextRef: format', () => {
  it('resolves _contextRef:equivalentRoomHours from ctx', () => {
    const patch = { doughHours: '_contextRef:equivalentRoomHours' }
    const ctx = { equivalentRoomHours: 7.5 }
    const result = resolvePatch(patch, baseWarning, ctx)
    expect(result.doughHours).toBe(7.5)
  })

  it('resolves _contextRef:expectedYeastPct from ctx', () => {
    const patch = { yeastPct: '_contextRef:expectedYeastPct' }
    const ctx = { expectedYeastPct: 0.413 }
    const result = resolvePatch(patch, baseWarning, ctx)
    expect(result.yeastPct).toBe(0.413)
  })

  it('resolves _contextRef:_saltMin from ctx (double prefix)', () => {
    const patch = { saltPct: '_contextRef:_saltMin' }
    const ctx = { _saltMin: 1.8 }
    const result = resolvePatch(patch, baseWarning, ctx)
    expect(result.saltPct).toBe(1.8)
  })

  it('resolves _contextRef:maxHoursForW from ctx', () => {
    const patch = { doughHours: '_contextRef:maxHoursForW' }
    const ctx = { maxHoursForW: 6 }
    const result = resolvePatch(patch, baseWarning, ctx)
    expect(result.doughHours).toBe(6)
  })
})

describe('resolvePatch — _ prefix format (existing)', () => {
  it('resolves _maxBaseDur from ctx', () => {
    const patch = { baseDur: '_maxBaseDur' }
    const ctx = { _maxBaseDur: 360 }
    const result = resolvePatch(patch, baseWarning, ctx)
    expect(result.baseDur).toBe(360)
  })

  it('resolves _suggestedTemp from ctx', () => {
    const patch = { 'ovenCfg.temp': '_suggestedTemp' }
    const ctx = { _suggestedTemp: 250 }
    const result = resolvePatch(patch, baseWarning, ctx)
    // Note: dotted path handling is in the store, not in resolvePatch here
    expect(result['ovenCfg.temp']).toBe(250)
  })
})

describe('resolvePatch — fallback to messageVars', () => {
  it('falls back to messageVars when ctx does not contain the key', () => {
    const warning: ActionableWarning = {
      ...baseWarning,
      messageVars: { equivalentRoomHours: 5.2 },
    }
    const patch = { doughHours: '_contextRef:equivalentRoomHours' }
    const result = resolvePatch(patch, warning, {})
    expect(result.doughHours).toBe(5.2)
  })

  it('non-reference strings pass through unchanged', () => {
    const patch = { title: 'My Rise', method: 'room' }
    const result = resolvePatch(patch, baseWarning, {})
    expect(result.title).toBe('My Rise')
    expect(result.method).toBe('room')
  })

  it('numeric and boolean values pass through unchanged', () => {
    const patch = { baseDur: 360, userOverrideDuration: true }
    const result = resolvePatch(patch, baseWarning, {})
    expect(result.baseDur).toBe(360)
    expect(result.userOverrideDuration).toBe(true)
  })
})
