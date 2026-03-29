import { describe, it, expect } from 'vitest'
import { calcYeastPctClient, calcYeastPct } from '@commons/utils/dough-manager'
import { staticProvider } from '@commons/utils/science/static-science-provider'

describe('DoughManager — calcYeastPctClient with flourW', () => {
  const hours = 18
  const hyd = 60
  const tempC = 24

  it('returns same result when flourW is undefined', () => {
    const withoutW = calcYeastPctClient(hours, hyd, tempC)
    const withUndef = calcYeastPctClient(hours, hyd, tempC, undefined)
    expect(withoutW).toBe(withUndef)
  })

  it('W=280 is neutral (factor ≈ 1.0)', () => {
    const base = calcYeastPctClient(hours, hyd, tempC)
    const with280 = calcYeastPctClient(hours, hyd, tempC, 280)
    expect(with280).toBe(base)
  })

  it('W=180 increases yeast (factor ≈ 1.56)', () => {
    const base = calcYeastPctClient(hours, hyd, tempC)
    const withLowW = calcYeastPctClient(hours, hyd, tempC, 180)
    expect(withLowW).toBeGreaterThan(base)
    // Factor should be 280/180 ≈ 1.556
    expect(withLowW / base).toBeCloseTo(280 / 180, 1)
  })

  it('W=350 decreases yeast (factor ≈ 0.8)', () => {
    const base = calcYeastPctClient(hours, hyd, tempC)
    const withHighW = calcYeastPctClient(hours, hyd, tempC, 350)
    expect(withHighW).toBeLessThan(base)
    // Factor should be 280/350 = 0.8
    expect(withHighW / base).toBeCloseTo(280 / 350, 1)
  })

  it('clamps to max factor 2.0 for very low W', () => {
    const base = calcYeastPctClient(hours, hyd, tempC)
    const withW60 = calcYeastPctClient(hours, hyd, tempC, 60)
    // 280/60 = 4.67, but clamped to 2.0
    expect(withW60 / base).toBeCloseTo(2.0, 1)
  })

  it('clamps to min factor 0.6 for very high W', () => {
    const base = calcYeastPctClient(hours, hyd, tempC)
    const withW500 = calcYeastPctClient(hours, hyd, tempC, 500)
    // 280/500 = 0.56, but clamped to 0.6
    expect(withW500 / base).toBeCloseTo(0.6, 1)
  })
})

describe('DoughManager — calcYeastPct with provider + flourW', () => {
  const provider = staticProvider

  it('W=280 is neutral with provider', () => {
    const base = calcYeastPct(provider, 18, 24)
    const with280 = calcYeastPct(provider, 18, 24, undefined, 280)
    expect(with280).toBe(base)
  })

  it('W=180 increases yeast with provider', () => {
    const base = calcYeastPct(provider, 18, 24)
    const withLowW = calcYeastPct(provider, 18, 24, undefined, 180)
    expect(withLowW).toBeGreaterThan(base)
  })

  it('W=350 decreases yeast with provider', () => {
    const base = calcYeastPct(provider, 18, 24)
    const withHighW = calcYeastPct(provider, 18, 24, undefined, 350)
    expect(withHighW).toBeLessThan(base)
  })
})
