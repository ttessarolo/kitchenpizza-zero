import { describe, it, expect } from 'vitest'
import {
  rnd,
  getFlour,
  blendFlourProperties,
  estimateW,
  calcYeastPct,
  yeastGrams,
  calcFinalDoughTemp,
  computeSuggestedSalt,
  getSaltPct,
  getSugarPct,
  getFatPct,
  getDoughDefaults,
  getDoughWarnings,
  maxRiseHoursForW,
} from '@commons/utils/dough-manager'
import { FLOUR_CATALOG } from '@/local_data/flour-catalog'
import type { FlourIngredient, LiquidIngredient, SaltIngredient, SugarIngredient, FatIngredient } from '@commons/types/recipe'

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const makeFlour = (type: string, g: number): FlourIngredient => ({ id: 0, type, g, temp: null })
const makeLiquid = (type: string, g: number, temp?: number): LiquidIngredient => ({ id: 0, type, g, temp: temp ?? null })
const makeSalt = (g: number): SaltIngredient => ({ id: 0, type: 'sale_fino', g })
const makeSugar = (g: number): SugarIngredient => ({ id: 0, type: 'zucchero', g })
const makeFat = (g: number): FatIngredient => ({ id: 0, type: 'evo', g })

// ═══════════════════════════════════════════════════════════════
// rnd — Intelligent rounding
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — rnd', () => {
  it('rounds >=100 to integer', () => {
    expect(rnd(150.7)).toBe(151)
    expect(rnd(100.3)).toBe(100)
  })

  it('rounds >=10 to nearest 0.5', () => {
    expect(rnd(12.3)).toBe(12.5)
    expect(rnd(10.1)).toBe(10)
    expect(rnd(15.7)).toBe(15.5)
  })

  it('rounds <10 to nearest 0.1', () => {
    expect(rnd(2.34)).toBe(2.3)
    expect(rnd(0.55)).toBe(0.6)
    expect(rnd(9.99)).toBe(10)
  })
})

// ═══════════════════════════════════════════════════════════════
// blendFlourProperties — Weighted average
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — blendFlourProperties', () => {
  it('returns defaults for empty flour array', () => {
    const result = blendFlourProperties([], FLOUR_CATALOG)
    expect(result.W).toBe(280)
    expect(result.protein).toBe(12)
  })

  it('returns exact values for single flour', () => {
    const flour = FLOUR_CATALOG.find((f) => f.key === 'gt_00_for')!
    const result = blendFlourProperties([makeFlour('gt_00_for', 500)], FLOUR_CATALOG)
    expect(result.W).toBe(flour.W)
    expect(result.protein).toBeCloseTo(flour.protein, 0)
  })

  it('blends W as weighted average for two flours', () => {
    // 50/50 mix of two flours should give average W
    const f1 = FLOUR_CATALOG.find((f) => f.key === 'gt_00_for')!
    const f2 = FLOUR_CATALOG.find((f) => f.key === 'gt_00_deb')!
    const result = blendFlourProperties(
      [makeFlour('gt_00_for', 500), makeFlour('gt_00_deb', 500)],
      FLOUR_CATALOG,
    )
    const expectedW = Math.round((f1.W + f2.W) / 2)
    expect(result.W).toBe(expectedW)
  })

  it('weights heavier flour more in blend', () => {
    // 80/20 mix: result should be closer to the 80% flour
    const f1 = FLOUR_CATALOG.find((f) => f.key === 'gt_00_for')!
    const result = blendFlourProperties(
      [makeFlour('gt_00_for', 800), makeFlour('gt_00_deb', 200)],
      FLOUR_CATALOG,
    )
    // W should be closer to f1.W than the average
    expect(Math.abs(result.W - f1.W)).toBeLessThan(50)
  })
})

// ═══════════════════════════════════════════════════════════════
// estimateW — W from protein correlation
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — estimateW', () => {
  it('estimates W for typical soft wheat protein levels', () => {
    expect(estimateW(12)).toBe(194)   // 22*12-70 = 194
    expect(estimateW(14)).toBe(238)   // 22*14-70 = 238
  })

  it('clamps to minimum 60', () => {
    expect(estimateW(5)).toBe(60)
  })

  it('clamps to maximum 420', () => {
    expect(estimateW(25)).toBe(420)
  })
})

// ═══════════════════════════════════════════════════════════════
// calcYeastPct — Casucci Formula L
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — calcYeastPct (Casucci Formula L)', () => {
  it('returns 0 for invalid inputs', () => {
    expect(calcYeastPct(0, 60)).toBe(0)
    expect(calcYeastPct(10, 60, 0)).toBe(0)
    expect(calcYeastPct(-1, 60)).toBe(0)
  })

  it('shorter rise time requires more yeast', () => {
    const short = calcYeastPct(4, 60, 24)
    const long = calcYeastPct(18, 60, 24)
    expect(short).toBeGreaterThan(long)
  })

  it('higher temperature requires less yeast', () => {
    const cold = calcYeastPct(18, 60, 18)
    const warm = calcYeastPct(18, 60, 28)
    expect(cold).toBeGreaterThan(warm)
  })

  it('produces reasonable values for typical pizza (18h, 24°C)', () => {
    const pct = calcYeastPct(18, 60, 24)
    // Should be around 0.15-0.25% for 18h at 24°C
    expect(pct).toBeGreaterThan(0.1)
    expect(pct).toBeLessThan(0.4)
  })

  it('produces reasonable values for short rise (2h, 24°C)', () => {
    const pct = calcYeastPct(2, 60, 24)
    // Should be around 1.5-2.0% for 2h at 24°C
    expect(pct).toBeGreaterThan(1)
    expect(pct).toBeLessThan(3)
  })
})

describe('DoughManager — yeastGrams', () => {
  it('converts percentage to grams', () => {
    expect(yeastGrams(1, 1000)).toBe(10)    // 1% of 1000g = 10g
    expect(yeastGrams(0.22, 500)).toBe(1.1)  // 0.22% of 500g = 1.1g
  })
})

// ═══════════════════════════════════════════════════════════════
// calcFinalDoughTemp — Dough temperature
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — calcFinalDoughTemp', () => {
  it('returns ambient temp when no ingredients', () => {
    expect(calcFinalDoughTemp([], [], 22, 0)).toBe(22)
  })

  it('calculates weighted average with friction', () => {
    const flours = [makeFlour('gt_00_for', 500)]
    const liquids = [makeLiquid('Acqua', 300, 10)]
    // Flour at ambient (22°C), water at 10°C, friction 2°C
    const result = calcFinalDoughTemp(flours, liquids, 22, 2)
    // Should be between 10 and 22, plus friction
    expect(result).toBeGreaterThan(12)
    expect(result).toBeLessThan(25)
  })

  it('includes 15% air incorporation at ambient temp', () => {
    const flours = [makeFlour('gt_00_for', 500)]
    const liquids = [makeLiquid('Acqua', 300, 5)]
    const withAir = calcFinalDoughTemp(flours, liquids, 25, 0)
    // Air incorporation pulls result slightly toward ambient
    expect(withAir).toBeGreaterThan(10) // not just flour+water average
  })
})

// ═══════════════════════════════════════════════════════════════
// Composition metrics — salt%, sugar%, fat%
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — composition percentages', () => {
  it('getSaltPct calculates correctly', () => {
    expect(getSaltPct([makeSalt(25)], 1000)).toBe(2.5) // 25/1000 = 2.5%
    expect(getSaltPct([], 1000)).toBe(0)
    expect(getSaltPct([makeSalt(10)], 0)).toBe(0)
  })

  it('getSugarPct calculates correctly', () => {
    expect(getSugarPct([makeSugar(50)], 1000)).toBe(5) // 50/1000 = 5%
  })

  it('getFatPct calculates correctly', () => {
    expect(getFatPct([makeFat(30)], 1000)).toBe(3) // 30/1000 = 3%
  })

  it('computeSuggestedSalt stays in 2.0-3.0% range', () => {
    const low = computeSuggestedSalt(1000, 50)
    const high = computeSuggestedSalt(1000, 90)
    expect(low).toBeGreaterThanOrEqual(20) // 2.0% of 1000g
    expect(high).toBeLessThanOrEqual(30)   // 3.0% of 1000g
  })
})

// ═══════════════════════════════════════════════════════════════
// getDoughDefaults — Lookup with fallback
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — getDoughDefaults', () => {
  it('returns exact match for pizza napoletana', () => {
    const d = getDoughDefaults('pizza', 'napoletana')
    expect(d.type).toBe('pizza')
    expect(d.subtype).toBe('napoletana')
    expect(d.defaultDoughHours).toBe(18)
    expect(d.saltPctDefault).toBe(2.3)
  })

  it('falls back to type-level default', () => {
    const d = getDoughDefaults('pizza', 'unknown_subtype')
    expect(d.type).toBe('pizza')
    expect(d.subtype).toBeNull()
  })

  it('falls back to "altro" for unknown type', () => {
    const d = getDoughDefaults('sconosciuto', null)
    expect(d.type).toBe('altro')
  })

  it('returns dolce defaults for brioche', () => {
    const d = getDoughDefaults('dolce', 'brioche')
    expect(d.fatPctDefault).toBe(18)
    expect(d.saltPctDefault).toBe(0.8)
  })
})

// ═══════════════════════════════════════════════════════════════
// getDoughWarnings — Composition warnings
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — getDoughWarnings', () => {
  const baseProfile = {
    doughHours: 18,
    yeastPct: 0.22,
    saltPct: 2.3,
    fatPct: 0,
    hydration: 65,
    recipeType: 'pizza',
    recipeSubtype: 'napoletana',
  }

  it('returns no warnings for standard napoletana', () => {
    const warnings = getDoughWarnings(baseProfile)
    expect(warnings).toHaveLength(0)
  })

  it('warns when yeast is too low', () => {
    const w = getDoughWarnings({ ...baseProfile, yeastPct: 0.01 })
    expect(w.find((w) => w.id === 'yeast_too_low')).toBeDefined()
    expect(w.find((w) => w.id === 'yeast_too_low')!.severity).toBe('error')
  })

  it('warns when yeast is too high', () => {
    const w = getDoughWarnings({ ...baseProfile, yeastPct: 4.0 })
    expect(w.find((w) => w.id === 'yeast_too_high')).toBeDefined()
  })

  it('warns when salt is below range', () => {
    const w = getDoughWarnings({ ...baseProfile, saltPct: 1.0 })
    expect(w.find((w) => w.id === 'salt_low')).toBeDefined()
  })

  it('warns when salt is above range', () => {
    const w = getDoughWarnings({ ...baseProfile, saltPct: 3.5 })
    expect(w.some((w) => w.id === 'salt_high' || w.id === 'salt_extreme')).toBe(true)
  })

  it('warns for extreme salt (>3%)', () => {
    const w = getDoughWarnings({ ...baseProfile, saltPct: 3.5 })
    expect(w.find((w) => w.id === 'salt_extreme')).toBeDefined()
    expect(w.find((w) => w.id === 'salt_extreme')!.severity).toBe('error')
  })

  it('warns for high fat in pizza', () => {
    const w = getDoughWarnings({ ...baseProfile, fatPct: 10 })
    expect(w.find((w) => w.id === 'fat_high')).toBeDefined()
  })

  it('does NOT warn for high fat in dolce', () => {
    const w = getDoughWarnings({ ...baseProfile, recipeType: 'dolce', recipeSubtype: 'brioche', fatPct: 15 })
    expect(w.find((w) => w.id === 'fat_extreme')).toBeUndefined()
  })

  it('warns for extreme hydration (>90%)', () => {
    const w = getDoughWarnings({ ...baseProfile, hydration: 95 })
    expect(w.find((w) => w.id === 'hyd_extreme')).toBeDefined()
  })

  it('warns for low hydration (<45%)', () => {
    const w = getDoughWarnings({ ...baseProfile, hydration: 40 })
    expect(w.find((w) => w.id === 'hyd_low')).toBeDefined()
  })

  it('warns for extreme duration (>72h)', () => {
    const w = getDoughWarnings({ ...baseProfile, doughHours: 96 })
    expect(w.find((w) => w.id === 'hours_extreme')).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// maxRiseHoursForW — Flour strength vs rise duration
// ═══════════════════════════════════════════════════════════════

describe('DoughManager — maxRiseHoursForW', () => {
  it('strong flour (W>380) allows up to 20h', () => {
    expect(maxRiseHoursForW(400)).toBe(20)
  })

  it('medium flour (W~300) allows up to 10h', () => {
    expect(maxRiseHoursForW(300)).toBe(10)
  })

  it('weak flour (W<180) allows only 1h', () => {
    expect(maxRiseHoursForW(150)).toBe(1)
  })

  it('matches Casucci Cap. 44 table', () => {
    expect(maxRiseHoursForW(390)).toBe(20)
    expect(maxRiseHoursForW(330)).toBe(14)
    expect(maxRiseHoursForW(295)).toBe(10)
    expect(maxRiseHoursForW(250)).toBe(6)
    expect(maxRiseHoursForW(190)).toBe(2)
    expect(maxRiseHoursForW(100)).toBe(1)
  })
})
