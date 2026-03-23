import { describe, it, expect } from 'vitest'
import { computePreFermentAmounts, validatePreFerment, rnd, recalcPreFermentIngredients } from '@commons/utils/recipe'
import { makeStep, makePfCfg } from './synthetic_data/helpers'

describe('Pre-ferment: Biga calculations', () => {
  const totalDough = 1000

  it('Biga 80%: correct flour/water/yeast split', () => {
    const cfg = makePfCfg({ preFermentPct: 80, hydrationPct: 44, yeastPct: 1 })
    const pf = computePreFermentAmounts(totalDough, cfg)
    expect(pf.pfWeight).toBe(800)
    expect(pf.pfFlour).toBe(rnd(800 / 1.44))
    expect(pf.pfWater).toBe(rnd(pf.pfFlour * 0.44))
    expect(pf.pfYeast).toBe(rnd(pf.pfFlour * 0.01))
  })

  it('Biga 30%: lower amounts', () => {
    const cfg = makePfCfg({ preFermentPct: 30, hydrationPct: 44, yeastPct: 1 })
    const pf = computePreFermentAmounts(totalDough, cfg)
    expect(pf.pfWeight).toBe(300)
    expect(pf.pfFlour).toBeCloseTo(208, 0)
    expect(pf.pfWater).toBeCloseTo(91.5, 0)
  })

  it('Biga 100%: all dough is pre-ferment', () => {
    // At 100% biga with 65% hydration to match the recipe hydration
    const cfg = makePfCfg({ preFermentPct: 100, hydrationPct: 65, yeastPct: 1 })
    const pf = computePreFermentAmounts(totalDough, cfg)
    expect(pf.pfWeight).toBe(1000)
    // pfFlour = 1000 / (1 + 0.65) ≈ 606
    expect(pf.pfFlour).toBeCloseTo(606, 0)
    // pfWater = 606 * 0.65 ≈ 394
    expect(pf.pfWater).toBeCloseTo(394, 0)
  })
})

describe('Pre-ferment: Poolish calculations', () => {
  const totalDough = 1000

  it('Poolish 40% at fixed 100% hydration', () => {
    const cfg = makePfCfg({ preFermentPct: 40, hydrationPct: 100, yeastPct: 0.1 })
    const pf = computePreFermentAmounts(totalDough, cfg)
    expect(pf.pfWeight).toBe(400)
    expect(pf.pfFlour).toBe(200) // 400 / 2
    expect(pf.pfWater).toBe(200) // 200 * 1.0
    expect(pf.pfYeast).toBe(0.2)
  })
})

describe('Pre-ferment: switching Biga → Poolish', () => {
  const totalDough = 1000

  it('recalculates amounts when switching from Biga to Poolish', () => {
    const bigaCfg = makePfCfg({ preFermentPct: 45, hydrationPct: 44, yeastPct: 1 })
    const bigaPf = computePreFermentAmounts(totalDough, bigaCfg)

    // Switch to Poolish defaults
    const poolishCfg = makePfCfg({ preFermentPct: 40, hydrationPct: 100, yeastPct: 0.1 })
    const poolishPf = computePreFermentAmounts(totalDough, poolishCfg)

    // Poolish has equal flour and water (100% hydration)
    expect(poolishPf.pfFlour).toBe(poolishPf.pfWater)
    // Biga has more flour than water (44% hydration)
    expect(bigaPf.pfFlour).toBeGreaterThan(bigaPf.pfWater)
    // Different total weights
    expect(bigaPf.pfWeight).not.toBe(poolishPf.pfWeight)
  })

  it('switching back Poolish → Biga restores original ratios', () => {
    const bigaCfg = makePfCfg({ preFermentPct: 45, hydrationPct: 44, yeastPct: 1 })
    const bigaPf = computePreFermentAmounts(totalDough, bigaCfg)

    // Switch to Poolish then back
    const poolishCfg = makePfCfg({ preFermentPct: 40, hydrationPct: 100, yeastPct: 0.1 })
    computePreFermentAmounts(totalDough, poolishCfg)

    // Back to Biga
    const bigaPf2 = computePreFermentAmounts(totalDough, bigaCfg)
    expect(bigaPf2.pfFlour).toBe(bigaPf.pfFlour)
    expect(bigaPf2.pfWater).toBe(bigaPf.pfWater)
  })
})

describe('Pre-ferment: percentage changes', () => {
  const totalDough = 1000

  it('Biga 80% → 30%: amounts decrease proportionally', () => {
    const pf80 = computePreFermentAmounts(totalDough, makePfCfg({ preFermentPct: 80, hydrationPct: 44, yeastPct: 1 }))
    const pf30 = computePreFermentAmounts(totalDough, makePfCfg({ preFermentPct: 30, hydrationPct: 44, yeastPct: 1 }))

    expect(pf30.pfWeight).toBe(300)
    expect(pf80.pfWeight).toBe(800)
    expect(pf30.pfFlour).toBeLessThan(pf80.pfFlour)
    expect(pf30.pfWater).toBeLessThan(pf80.pfWater)
    // Ratio flour/water stays the same (same hydration)
    const ratio80 = pf80.pfWater / pf80.pfFlour
    const ratio30 = pf30.pfWater / pf30.pfFlour
    expect(ratio30).toBeCloseTo(ratio80, 1)
  })

  it('Biga 80% → 100%: maximum pre-ferment', () => {
    const pf = computePreFermentAmounts(totalDough, makePfCfg({ preFermentPct: 100, hydrationPct: 44, yeastPct: 1 }))
    expect(pf.pfWeight).toBe(1000)
    // Main dough would have flour: totalFlour - pfFlour (should be ~0 or negative if hydration mismatch)
    expect(pf.pfFlour + pf.pfWater).toBeCloseTo(1000, -1) // pfYeast is negligible
  })
})

describe('Pre-ferment: validation', () => {
  it('accepts valid 100% biga', () => {
    const cfg = makePfCfg({ preFermentPct: 100, hydrationPct: 65, yeastPct: 1 })
    const errors = validatePreFerment(cfg, 606, 394, 1000)
    expect(errors).toHaveLength(0)
  })

  it('rejects preFermentPct at 0', () => {
    const errors = validatePreFerment(makePfCfg({ preFermentPct: 0 }), 606, 394, 1000)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects preFermentPct at 101', () => {
    const errors = validatePreFerment(makePfCfg({ preFermentPct: 101 }), 606, 394, 1000)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects negative preFermentPct', () => {
    const errors = validatePreFerment(makePfCfg({ preFermentPct: -5 }), 606, 394, 1000)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('warns when pfFlour exceeds total flour', () => {
    // 80% biga at 44% hydration on 1000g → pfFlour ≈ 555g, but totalFlour is only 300g
    const errors = validatePreFerment(makePfCfg({ preFermentPct: 80, hydrationPct: 44 }), 300, 400, 1000)
    expect(errors.some(e => e.includes('farina'))).toBe(true)
  })
})

describe('Pre-ferment: sourdough / single-phase', () => {
  it('sourdough has no yeast in calculation', () => {
    const cfg = makePfCfg({ preFermentPct: 25, hydrationPct: 50, yeastType: null, yeastPct: null })
    const pf = computePreFermentAmounts(1000, cfg)
    expect(pf.pfYeast).toBe(0)
    expect(pf.pfWeight).toBe(250)
    expect(pf.pfFlour).toBe(rnd(250 / 1.50))
    expect(pf.pfWater).toBe(rnd(pf.pfFlour * 0.50))
  })

  it('licoli (100% hydration starter)', () => {
    const cfg = makePfCfg({ preFermentPct: 25, hydrationPct: 100, yeastType: null, yeastPct: null })
    const pf = computePreFermentAmounts(1000, cfg)
    expect(pf.pfFlour).toBe(pf.pfWater) // 50/50 split
  })
})

describe('recalcPreFermentIngredients: ingredient↔config coherence', () => {
  const totalDough = 1000

  it('Biga 80%: step ingredients match computePreFermentAmounts', () => {
    const cfg = makePfCfg({ preFermentPct: 80, hydrationPct: 44, yeastPct: 1 })
    const step = makeStep({
      id: 'pf', type: 'pre_ferment', subtype: 'biga',
      flours: [{ id: 0, type: 'gt_0_for', g: 100, temp: null }], // wrong initial values
      liquids: [{ id: 0, type: 'Acqua', g: 50, temp: null }],
      yeasts: [{ id: 0, type: 'fresh', g: 1 }],
      preFermentCfg: cfg,
    })
    const recalced = recalcPreFermentIngredients(step, totalDough)
    const expected = computePreFermentAmounts(totalDough, cfg)
    expect(recalced.flours[0].g).toBe(expected.pfFlour)
    expect(recalced.liquids[0].g).toBe(expected.pfWater)
    expect(recalced.yeasts[0].g).toBe(expected.pfYeast)
  })

  it('switch Biga→Poolish: ingredients update to 100% hydration', () => {
    const bigaCfg = makePfCfg({ preFermentPct: 80, hydrationPct: 44, yeastPct: 1 })
    const bigaStep = makeStep({
      id: 'pf', type: 'pre_ferment', subtype: 'biga',
      flours: [{ id: 0, type: 'gt_0_for', g: 555.5, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 244.5, temp: null }],
      yeasts: [{ id: 0, type: 'fresh', g: 5.5 }],
      preFermentCfg: bigaCfg,
    })

    // Switch to Poolish: new config
    const poolishCfg = makePfCfg({ preFermentPct: 40, hydrationPct: 100, yeastPct: 0.1 })
    const poolishStep = { ...bigaStep, subtype: 'poolish', preFermentCfg: poolishCfg }
    const recalced = recalcPreFermentIngredients(poolishStep, totalDough)

    // Poolish at 100% hydration: flour = water
    expect(recalced.flours[0].g).toBe(recalced.liquids[0].g)
    const expectedPf = computePreFermentAmounts(totalDough, poolishCfg)
    expect(recalced.flours[0].g).toBe(expectedPf.pfFlour)
    expect(recalced.liquids[0].g).toBe(expectedPf.pfWater)
  })

  it('change preFermentPct 80%→30%: ingredients decrease', () => {
    const cfg80 = makePfCfg({ preFermentPct: 80, hydrationPct: 44, yeastPct: 1 })
    const step = makeStep({
      id: 'pf', type: 'pre_ferment',
      flours: [{ id: 0, type: 'f', g: 555, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 244, temp: null }],
      yeasts: [{ id: 0, type: 'fresh', g: 5.5 }],
      preFermentCfg: cfg80,
    })
    const cfg30 = makePfCfg({ preFermentPct: 30, hydrationPct: 44, yeastPct: 1 })
    const recalced = recalcPreFermentIngredients({ ...step, preFermentCfg: cfg30 }, totalDough)
    expect(recalced.flours[0].g).toBeLessThan(step.flours[0].g)
    expect(recalced.liquids[0].g).toBeLessThan(step.liquids[0].g)
  })

  it('preFermentPct 100%: all dough weight in pre-ferment', () => {
    const cfg = makePfCfg({ preFermentPct: 100, hydrationPct: 65, yeastPct: 1 })
    const step = makeStep({
      id: 'pf', type: 'pre_ferment',
      flours: [{ id: 0, type: 'f', g: 100, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 50, temp: null }],
      preFermentCfg: cfg,
    })
    const recalced = recalcPreFermentIngredients(step, totalDough)
    const expected = computePreFermentAmounts(totalDough, cfg)
    expect(recalced.flours[0].g).toBe(expected.pfFlour)
    expect(recalced.flours[0].g + recalced.liquids[0].g).toBeCloseTo(1000, -1) // ~1000g total
  })

  it('single-phase (sourdough): no yeasts in result', () => {
    const cfg = makePfCfg({ preFermentPct: 25, hydrationPct: 50, yeastType: null, yeastPct: null })
    const step = makeStep({
      id: 'pf', type: 'pre_ferment', subtype: 'sourdough',
      flours: [{ id: 0, type: 'f', g: 100, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 50, temp: null }],
      yeasts: [{ id: 0, type: 'fresh', g: 3 }], // should be removed
      preFermentCfg: cfg,
    })
    const recalced = recalcPreFermentIngredients(step, totalDough)
    expect(recalced.yeasts).toHaveLength(0)
  })

  it('preserves flour type and temp after recalc', () => {
    const cfg = makePfCfg({ preFermentPct: 45, hydrationPct: 44, yeastPct: 1 })
    const step = makeStep({
      id: 'pf', type: 'pre_ferment',
      flours: [{ id: 0, type: 'gt_00_deb', g: 100, temp: 20 }],
      liquids: [{ id: 0, type: 'Acqua', g: 50, temp: 18 }],
      preFermentCfg: cfg,
    })
    const recalced = recalcPreFermentIngredients(step, totalDough)
    expect(recalced.flours[0].type).toBe('gt_00_deb')
    expect(recalced.flours[0].temp).toBe(20)
    expect(recalced.liquids[0].temp).toBe(18)
  })
})
