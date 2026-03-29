import { describe, it, expect } from 'vitest'
import { calcYeastPct } from '@commons/utils/dough-manager'
import { staticProvider } from '@commons/utils/science/static-science-provider'

describe('DoughManager — calcYeastPct with flourW (via provider)', () => {
  const hours = 18
  const hyd = 60
  const tempC = 24

  it('returns same result when flourW is undefined', () => {
    const withoutW = calcYeastPct(staticProvider, hours, hyd, tempC)
    const withUndef = calcYeastPct(staticProvider, hours, hyd, tempC, undefined, undefined)
    expect(withoutW).toBe(withUndef)
  })

  it('W=280 is neutral (factor ≈ 1.0)', () => {
    const base = calcYeastPct(staticProvider, hours, hyd, tempC)
    const with280 = calcYeastPct(staticProvider, hours, hyd, tempC, undefined, 280)
    expect(with280).toBe(base)
  })

  it('W=180 increases yeast (factor ≈ 1.56)', () => {
    const base = calcYeastPct(staticProvider, hours, hyd, tempC)
    const withLowW = calcYeastPct(staticProvider, hours, hyd, tempC, undefined, 180)
    expect(withLowW).toBeGreaterThan(base)
    // Factor should be 280/180 ≈ 1.556
    expect(withLowW / base).toBeCloseTo(280 / 180, 1)
  })

  it('W=350 decreases yeast (factor ≈ 0.8)', () => {
    const base = calcYeastPct(staticProvider, hours, hyd, tempC)
    const withHighW = calcYeastPct(staticProvider, hours, hyd, tempC, undefined, 350)
    expect(withHighW).toBeLessThan(base)
    // Factor should be 280/350 = 0.8
    expect(withHighW / base).toBeCloseTo(280 / 350, 1)
  })

  it('clamps to max factor 2.0 for very low W', () => {
    const base = calcYeastPct(staticProvider, hours, hyd, tempC)
    const withW60 = calcYeastPct(staticProvider, hours, hyd, tempC, undefined, 60)
    // 280/60 = 4.67, but clamped to 2.0
    expect(withW60 / base).toBeCloseTo(2.0, 1)
  })

  it('clamps to min factor 0.6 for very high W', () => {
    const base = calcYeastPct(staticProvider, hours, hyd, tempC)
    const withW500 = calcYeastPct(staticProvider, hours, hyd, tempC, undefined, 500)
    // 280/500 = 0.56, but clamped to 0.6
    expect(withW500 / base).toBeCloseTo(0.6, 1)
  })
})
