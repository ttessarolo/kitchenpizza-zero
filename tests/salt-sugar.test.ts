import { describe, it, expect } from 'vitest'
import {
  computeSuggestedSalt,
  getSaltPct,
  getSugarPct,
  getFatPct,
  getStepTotalWeight,
} from '@commons/utils/recipe'
import { makeStep } from './synthetic_data/helpers'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { resolve } from 'path'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

describe('computeSuggestedSalt', () => {
  it('returns ~2.5% at standard hydration (60%)', () => {
    const salt = computeSuggestedSalt(1000, 60, provider)
    expect(salt).toBeCloseTo(25, 0)
  })

  it('increases salt with higher hydration', () => {
    const salt70 = computeSuggestedSalt(1000, 70, provider)
    const salt60 = computeSuggestedSalt(1000, 60, provider)
    expect(salt70).toBeGreaterThan(salt60)
  })

  it('caps at 3%', () => {
    const salt = computeSuggestedSalt(1000, 100, provider)
    expect(salt).toBeLessThanOrEqual(30)
  })

  it('minimum 2%', () => {
    const salt = computeSuggestedSalt(1000, 40, provider)
    expect(salt).toBeGreaterThanOrEqual(20)
  })
})

describe('getSaltPct', () => {
  it('computes percentage correctly', () => {
    const salts = [{ id: 0, type: 'sale_fino', g: 25 }]
    expect(getSaltPct(salts, 1000)).toBe(2.5)
  })

  it('returns 0 with no flour', () => {
    expect(getSaltPct([{ id: 0, type: 'sale_fino', g: 25 }], 0)).toBe(0)
  })

  it('sums multiple salts', () => {
    const salts = [
      { id: 0, type: 'sale_fino', g: 15 },
      { id: 1, type: 'sale_maldon', g: 10 },
    ]
    expect(getSaltPct(salts, 1000)).toBe(2.5)
  })
})

describe('getSugarPct', () => {
  it('computes percentage correctly', () => {
    const sugars = [{ id: 0, type: 'zucchero', g: 80 }]
    expect(getSugarPct(sugars, 1000)).toBe(8)
  })

  it('sums multiple sugars', () => {
    const sugars = [
      { id: 0, type: 'zucchero', g: 36 },
      { id: 1, type: 'miele', g: 6.3 },
    ]
    expect(getSugarPct(sugars, 1000)).toBeCloseTo(4.2, 0)
  })
})

describe('getStepTotalWeight includes salts and sugars', () => {
  it('includes salt and sugar in total', () => {
    const step = makeStep({
      id: 'test', type: 'dough',
      flours: [{ id: 0, type: 'f', g: 500, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
      salts: [{ id: 0, type: 'sale_fino', g: 15 }],
      sugars: [{ id: 0, type: 'zucchero', g: 30 }],
    })
    expect(getStepTotalWeight(step)).toBe(845)
  })

  it('works with empty salts/sugars', () => {
    const step = makeStep({
      id: 'test', type: 'dough',
      flours: [{ id: 0, type: 'f', g: 500, temp: null }],
    })
    // salts: [] and sugars: [] by default in makeStep
    expect(getStepTotalWeight(step)).toBe(500)
  })
})

describe('Salt/Sugar in recipe context', () => {
  it('Shokupan knead step has correct salt and sugar', () => {
    // From the migrated default-recipe.ts
    const salts = [{ id: 0, type: 'sale_fino', g: 7.2 }]
    const sugars = [{ id: 0, type: 'zucchero', g: 36 }, { id: 1, type: 'miele', g: 6.3 }]
    const totalFlour = 315 + 22.5 // knead flour + tangzhong flour
    expect(getSaltPct(salts, totalFlour)).toBeCloseTo(2.1, 0)
    expect(getSugarPct(sugars, totalFlour)).toBeCloseTo(12.5, 0)
  })

  it('Biga bread knead step has correct salt and malto', () => {
    // From the migrated recipe_2.ts
    const salts = [{ id: 0, type: 'sale_fino', g: 20 }]
    const sugars = [{ id: 0, type: 'malto_d', g: 2.4 }]
    const totalFlour = 50.5 + 555.5 // knead flour + biga flour
    expect(getSaltPct(salts, totalFlour)).toBeCloseTo(3.3, 0)
    expect(getSugarPct(sugars, totalFlour)).toBeCloseTo(0.4, 0)
  })
})

// ── Fat tests ──────────────────────────────────────────────────

describe('getFatPct', () => {
  it('computes percentage correctly', () => {
    const fats = [{ id: 0, type: 'olio_evo', g: 50 }]
    expect(getFatPct(fats, 1000)).toBe(5)
  })

  it('returns 0 with no flour', () => {
    expect(getFatPct([{ id: 0, type: 'olio_evo', g: 50 }], 0)).toBe(0)
  })

  it('sums multiple fats', () => {
    const fats = [
      { id: 0, type: 'olio_evo', g: 25 },
      { id: 1, type: 'burro', g: 45 },
    ]
    expect(getFatPct(fats, 1000)).toBe(7)
  })
})

describe('getStepTotalWeight includes fats', () => {
  it('includes fat in total', () => {
    const step = makeStep({
      id: 'test', type: 'dough',
      flours: [{ id: 0, type: 'f', g: 500, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
      fats: [{ id: 0, type: 'olio_evo', g: 25 }],
    })
    expect(getStepTotalWeight(step)).toBe(825)
  })
})

describe('Fat in recipe context', () => {
  it('Shokupan has burro as fat', () => {
    const fats = [{ id: 0, type: 'burro', g: 45 }]
    const totalFlour = 315 + 22.5
    expect(getFatPct(fats, totalFlour)).toBeCloseTo(13.3, 0)
  })

  it('Pizza Romana has olio EVO', () => {
    const fats = [{ id: 0, type: 'olio_evo', g: 35 }]
    expect(getFatPct(fats, 693)).toBeCloseTo(5.1, 0)
  })

  it('No fats is valid (many breads have no fat)', () => {
    expect(getFatPct([], 1000)).toBe(0)
  })
})
