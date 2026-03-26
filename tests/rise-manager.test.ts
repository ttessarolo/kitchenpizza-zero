import { describe, it, expect } from 'vitest'
import {
  calcRiseDuration,
  riseTemperatureFactor,
  getRiseMethod,
  getAllRiseMethods,
  getYeastType,
  maxRiseHoursForW,
  getRiseWarnings,
  RISE_METHODS,
  YEAST_TYPES,
} from '@commons/utils/rise-manager'
import type { BlendedFlourProps, RiseMethod } from '@commons/types/recipe'

const standardBP: BlendedFlourProps = {
  protein: 12, W: 280, PL: 0.55, absorption: 58, ash: 0.55,
  fiber: 2.2, starchDamage: 7, fermentSpeed: 1, fallingNumber: 340,
}

const weakBP: BlendedFlourProps = {
  ...standardBP, W: 150, protein: 9, fallingNumber: 280,
}

const strongBP: BlendedFlourProps = {
  ...standardBP, W: 380, protein: 14, fallingNumber: 380,
}

// ═══════════════════════════════════════════════════════════════
// Config data
// ═══════════════════════════════════════════════════════════════

describe('RiseManager — config data', () => {
  it('has 4 rise methods', () => {
    expect(RISE_METHODS).toHaveLength(4)
    expect(RISE_METHODS.map((m) => m.key)).toEqual(['room', 'fridge', 'ctrl18', 'ctrl12'])
  })

  it('fridge has highest time factor', () => {
    const fridge = RISE_METHODS.find((m) => m.key === 'fridge')!
    const room = RISE_METHODS.find((m) => m.key === 'room')!
    expect(fridge.tf).toBeGreaterThan(room.tf)
  })

  it('has yeast types with conversion factors', () => {
    expect(YEAST_TYPES.length).toBeGreaterThanOrEqual(5)
    const fresh = YEAST_TYPES.find((y) => y.key === 'fresh')!
    expect(fresh.toFresh).toBe(1)
    expect(fresh.speedF).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// calcRiseDuration
// ═══════════════════════════════════════════════════════════════

describe('RiseManager — calcRiseDuration', () => {
  it('produces reasonable duration for standard conditions', () => {
    const dur = calcRiseDuration(60, 'room', standardBP, 0.22, 1, 1)
    // W280, 0.22% yeast, room temp — formula gives ~212 min (~3.5h)
    expect(dur).toBeGreaterThan(100)
    expect(dur).toBeLessThan(600)
  })

  it('higher W flour → shorter rise (stronger gluten = faster development)', () => {
    // The formula uses 280/W factor: higher W → smaller factor → shorter duration
    const durW150 = calcRiseDuration(60, 'room', weakBP, 0.22, 1, 1)
    const durW280 = calcRiseDuration(60, 'room', standardBP, 0.22, 1, 1)
    const durW380 = calcRiseDuration(60, 'room', strongBP, 0.22, 1, 1)
    expect(durW380).toBeLessThan(durW280)
    expect(durW280).toBeLessThan(durW150)
  })

  it('more yeast → shorter rise', () => {
    const durLow = calcRiseDuration(60, 'room', standardBP, 0.1, 1, 1)
    const durHigh = calcRiseDuration(60, 'room', standardBP, 1.0, 1, 1)
    expect(durHigh).toBeLessThan(durLow)
  })

  it('fridge method → longer rise', () => {
    const durRoom = calcRiseDuration(60, 'room', standardBP, 0.22, 1, 1)
    const durFridge = calcRiseDuration(60, 'fridge', standardBP, 0.22, 1, 1)
    expect(durFridge).toBeGreaterThan(durRoom)
  })

  it('madre lievito (low speed factor) → longer rise', () => {
    const durFresh = calcRiseDuration(60, 'room', standardBP, 0.22, 1, 1)
    const durMadre = calcRiseDuration(60, 'room', standardBP, 0.22, 0.3, 1)
    expect(durMadre).toBeGreaterThan(durFresh)
  })

  it('high salt → slightly longer rise', () => {
    const durNormal = calcRiseDuration(60, 'room', standardBP, 0.22, 1, 1, undefined, 2.5)
    const durSalty = calcRiseDuration(60, 'room', standardBP, 0.22, 1, 1, undefined, 3.5)
    expect(durSalty).toBeGreaterThan(durNormal)
  })

  it('enforces minimum yeast of 0.5 in calculation', () => {
    // Very low yeast shouldn't produce Infinity
    const dur = calcRiseDuration(60, 'room', standardBP, 0.001, 1, 1)
    expect(Number.isFinite(dur)).toBe(true)
    expect(dur).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// riseTemperatureFactor
// ═══════════════════════════════════════════════════════════════

describe('RiseManager — riseTemperatureFactor', () => {
  it('returns 1.0 at 24°C for room method', () => {
    expect(riseTemperatureFactor(24, 'room')).toBeCloseTo(1.0, 3)
  })

  it('warmer FDT → factor < 1 (faster rise)', () => {
    expect(riseTemperatureFactor(30, 'room')).toBeLessThan(1)
  })

  it('cooler FDT → factor > 1 (slower rise)', () => {
    expect(riseTemperatureFactor(18, 'room')).toBeGreaterThan(1)
  })

  it('fridge method dampens FDT effect', () => {
    const roomEffect = Math.abs(riseTemperatureFactor(30, 'room') - 1)
    const fridgeEffect = Math.abs(riseTemperatureFactor(30, 'fridge') - 1)
    expect(fridgeEffect).toBeLessThan(roomEffect)
  })
})

// ═══════════════════════════════════════════════════════════════
// Method & yeast lookup
// ═══════════════════════════════════════════════════════════════

describe('RiseManager — lookups', () => {
  it('getRiseMethod returns correct method', () => {
    expect(getRiseMethod('fridge').key).toBe('fridge')
    expect(getRiseMethod('fridge').tf).toBe(3.6)
  })

  it('getRiseMethod falls back to room', () => {
    expect(getRiseMethod('unknown').key).toBe('room')
  })

  it('getAllRiseMethods returns all methods', () => {
    expect(getAllRiseMethods()).toHaveLength(4)
  })

  it('getYeastType returns correct type', () => {
    const fresh = getYeastType('fresh')
    expect(fresh.key).toBe('fresh')
    expect(fresh.toFresh).toBe(1)
  })

  it('getYeastType falls back to fresh', () => {
    expect(getYeastType('unknown').key).toBe('fresh')
  })
})

// ═══════════════════════════════════════════════════════════════
// maxRiseHoursForW
// ═══════════════════════════════════════════════════════════════

describe('RiseManager — maxRiseHoursForW', () => {
  it('matches Casucci Cap. 44 table', () => {
    expect(maxRiseHoursForW(400)).toBe(20)
    expect(maxRiseHoursForW(330)).toBe(14)
    expect(maxRiseHoursForW(295)).toBe(10)
    expect(maxRiseHoursForW(250)).toBe(6)
    expect(maxRiseHoursForW(190)).toBe(2)
    expect(maxRiseHoursForW(100)).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// getRiseWarnings
// ═══════════════════════════════════════════════════════════════

describe('RiseManager — getRiseWarnings', () => {
  it('warns when rise is too long for flour W at room temp', () => {
    const w = getRiseWarnings({ durationMin: 480, flourW: 200, yeastPct: 0.1, method: 'room' })
    expect(w.find((w) => w.id === 'rise_too_long_for_w')).toBeDefined()
  })

  it('does NOT warn for fridge (method compensates)', () => {
    const w = getRiseWarnings({ durationMin: 480, flourW: 200, yeastPct: 0.1, method: 'fridge' })
    expect(w.find((w) => w.id === 'rise_too_long_for_w')).toBeUndefined()
  })

  it('warns for very short rise (<15 min)', () => {
    const w = getRiseWarnings({ durationMin: 10, flourW: 280, yeastPct: 2, method: 'room' })
    expect(w.find((w) => w.id === 'rise_too_short')).toBeDefined()
  })

  it('no warnings for normal conditions', () => {
    const w = getRiseWarnings({ durationMin: 120, flourW: 280, yeastPct: 0.22, method: 'room' })
    expect(w).toHaveLength(0)
  })
})
