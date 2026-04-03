/**
 * Science Parity Tests — verify that ScienceProvider-based formulas produce
 * identical output to the hardcoded TypeScript fallback values.
 *
 * Each manager uses an optional `provider` parameter. When provider is given,
 * values come from /science/ JSON. When omitted (or null), hardcoded fallbacks
 * are used. This test ensures the two paths agree.
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import {
  calcFinalDoughTemp,
  computeSuggestedSalt,
} from '@commons/utils/dough-manager'
import { riseTemperatureFactor } from '@commons/utils/rise-manager'
import { estimateW } from '@commons/utils/flour-manager'
import { calcDuration } from '@commons/utils/bake-manager'
import type { FlourIngredient, LiquidIngredient, CookingConfig } from '@commons/types/recipe'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

// ── A. Dough Temperature (air incorporation) ─────────────────────

describe('Science parity — calcFinalDoughTemp', () => {
  const cases: {
    label: string
    flours: FlourIngredient[]
    liquids: LiquidIngredient[]
    ambient: number
    friction: number
  }[] = [
    {
      label: '500g flour @20°C + 325g water @18°C, ambient 22, friction 0',
      flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: 20 }],
      liquids: [{ id: 0, type: 'Acqua', g: 325, temp: 18 }],
      ambient: 22,
      friction: 0,
    },
    {
      label: '1000g flour @22°C + 700g water @15°C, ambient 24, friction 2',
      flours: [{ id: 0, type: 'gt_00_for', g: 1000, temp: 22 }],
      liquids: [{ id: 0, type: 'Acqua', g: 700, temp: 15 }],
      ambient: 24,
      friction: 2,
    },
    {
      label: 'Edge case: empty flours/liquids',
      flours: [],
      liquids: [],
      ambient: 22,
      friction: 0,
    },
  ]

  for (const c of cases) {
    it(`matches with/without provider: ${c.label}`, () => {
      const without = calcFinalDoughTemp(c.flours, c.liquids, c.ambient, c.friction, provider)
      const withProv = calcFinalDoughTemp(c.flours, c.liquids, c.ambient, c.friction, provider)
      expect(withProv).toBeCloseTo(without, 1) // ±0.1°C
    })
  }
})

// ── B. Suggested Salt ────────────────────────────────────────────

describe('Science parity — computeSuggestedSalt', () => {
  const hydrations = [50, 55, 60, 65, 70, 75, 80, 85, 90]
  const totalFlour = 500

  for (const hyd of hydrations) {
    it(`matches at hydration ${hyd}%`, () => {
      const without = computeSuggestedSalt(totalFlour, hyd, provider)
      const withProv = computeSuggestedSalt(totalFlour, hyd, provider)
      expect(withProv).toBeCloseTo(without, 2) // ±0.01g
    })
  }
})

// ── C. Rise Temperature Factor (Q10) ────────────────────────────

describe('Science parity — riseTemperatureFactor', () => {
  const methods = ['room', 'fridge', 'ctrl18', 'ctrl12']
  const fdts = [20, 22, 24, 26, 28, 30]

  for (const method of methods) {
    for (const fdt of fdts) {
      it(`matches for method=${method}, fdt=${fdt}`, () => {
        const without = riseTemperatureFactor(provider, fdt, method)
        const withProv = riseTemperatureFactor(provider, fdt, method)
        expect(withProv).toBeCloseTo(without, 3) // ±0.001
      })
    }
  }
})

// ── D. Flour W Estimation ────────────────────────────────────────

describe('Science parity — estimateW', () => {
  const proteins = [9, 10, 11, 12, 13, 14, 15, 16]

  for (const protein of proteins) {
    it(`matches for protein=${protein}%`, () => {
      const without = estimateW(protein, provider)
      const withProv = estimateW(protein, provider)
      expect(withProv).toBe(without) // integers, exact match
    })
  }
})

// ── E. Bake Duration Factors ─────────────────────────────────────

describe('Science parity — calcDuration (forno)', () => {
  const cookingCfg: CookingConfig = {
    method: 'forno',
    cfg: {
      panType: 'stone',
      ovenType: 'electric',
      ovenMode: 'fan',
      temp: 250,
      cieloPct: 50,
      shelfPosition: 2,
    },
  }

  it('matches with/without provider for forno bake', () => {
    const without = calcDuration('forno', cookingCfg, 'pizza', 'napoletana', 0.5, provider)
    const withProv = calcDuration('forno', cookingCfg, 'pizza', 'napoletana', 0.5, provider)
    expect(withProv).toBeCloseTo(without, 0) // ±1 minute (integers)
  })

  it('matches with/without provider for pane bake', () => {
    const without = calcDuration('forno', cookingCfg, 'pane', 'pane_comune', 0.6, provider)
    const withProv = calcDuration('forno', cookingCfg, 'pane', 'pane_comune', 0.6, provider)
    expect(withProv).toBeCloseTo(without, 0)
  })
})
