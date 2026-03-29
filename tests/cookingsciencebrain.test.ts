/**
 * CookingScienceBrain tests — verify that Science-driven manager functions
 * produce correct results via the ScienceProvider.
 *
 * These tests validate the Science JSON → Manager pipeline end-to-end.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { FileScienceProvider, type ScienceProvider } from '@commons/utils/science/science-provider'
import {
  calcYeastPct,
  getDoughWarnings,
  type DoughProfileInput,
} from '@commons/utils/dough-manager'
import {
  maxRiseHoursForW,
} from '@commons/utils/rise-manager'
import {
  classifyStrength,
} from '@commons/utils/flour-manager'
import * as path from 'path'

let provider: ScienceProvider

beforeAll(() => {
  provider = new FileScienceProvider(
    path.resolve(process.cwd(), 'science'),
    path.resolve(process.cwd(), 'commons/i18n'),
  )
})

// ═══════════════════════════════════════════════════════════════
// Yeast calculation via Science
// ═══════════════════════════════════════════════════════════════

describe('CookingScienceBrain — calcYeastPct', () => {
  const testCases = [
    { hours: 18, tempC: 24 },
    { hours: 4, tempC: 24 },
    { hours: 48, tempC: 18 },
    { hours: 2, tempC: 28 },
    { hours: 72, tempC: 4 },
    { hours: 1, tempC: 30 },
  ]

  for (const tc of testCases) {
    it(`hours=${tc.hours}, tempC=${tc.tempC} produces reasonable result`, () => {
      const result = calcYeastPct(provider, tc.hours, 65, tc.tempC)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(50) // reasonable upper bound
    })
  }

  it('shorter hours = more yeast', () => {
    const short = calcYeastPct(provider, 4, 65, 24)
    const long = calcYeastPct(provider, 18, 65, 24)
    expect(short).toBeGreaterThan(long)
  })

  it('higher temp = less yeast', () => {
    const cold = calcYeastPct(provider, 18, 65, 18)
    const warm = calcYeastPct(provider, 18, 65, 28)
    expect(cold).toBeGreaterThan(warm)
  })

  it('returns 0 for invalid inputs', () => {
    expect(calcYeastPct(provider, 0, 65, 24)).toBe(0)
    expect(calcYeastPct(provider, -1, 65, 24)).toBe(0)
    expect(calcYeastPct(provider, 18, 65, 0)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// Max rise hours via Science
// ═══════════════════════════════════════════════════════════════

describe('CookingScienceBrain — maxRiseHoursForW', () => {
  const testCases = [100, 180, 190, 220, 250, 290, 300, 320, 330, 380, 400]

  for (const W of testCases) {
    it(`W=${W} returns a positive number`, () => {
      const result = maxRiseHoursForW(provider, W)
      expect(result).toBeGreaterThan(0)
    })
  }

  it('matches Casucci Cap. 44 table', () => {
    expect(maxRiseHoursForW(provider, 400)).toBe(20)
    expect(maxRiseHoursForW(provider, 330)).toBe(14)
    expect(maxRiseHoursForW(provider, 295)).toBe(10)
    expect(maxRiseHoursForW(provider, 250)).toBe(6)
    expect(maxRiseHoursForW(provider, 190)).toBe(2)
    expect(maxRiseHoursForW(provider, 100)).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// Flour classification via Science
// ═══════════════════════════════════════════════════════════════

describe('CookingScienceBrain — classifyStrength', () => {
  const testCases: Array<{ W: number; expected: string }> = [
    { W: 60, expected: 'weak' },
    { W: 130, expected: 'weak' },
    { W: 179, expected: 'weak' },
    { W: 180, expected: 'medium' },
    { W: 215, expected: 'medium' },
    { W: 259, expected: 'medium' },
    { W: 260, expected: 'strong' },
    { W: 290, expected: 'strong' },
    { W: 350, expected: 'strong' },
    { W: 351, expected: 'very_strong' },
    { W: 380, expected: 'very_strong' },
    { W: 420, expected: 'very_strong' },
  ]

  for (const { W, expected } of testCases) {
    it(`W=${W} → ${expected}`, () => {
      expect(classifyStrength(provider, W)).toBe(expected)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// Dough warnings via Science
// ═══════════════════════════════════════════════════════════════

describe('CookingScienceBrain — getDoughWarnings', () => {
  const profiles: Array<{ label: string; profile: DoughProfileInput; expectIds: string[] }> = [
    {
      label: 'standard napoletana — no warnings',
      profile: { doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 0, hydration: 65, flourW: 280, recipeType: 'pizza', recipeSubtype: 'napoletana' },
      expectIds: [],
    },
    {
      label: 'very low yeast',
      profile: { doughHours: 18, yeastPct: 0.01, saltPct: 2.3, fatPct: 0, hydration: 65, flourW: 280, recipeType: 'pizza', recipeSubtype: 'napoletana' },
      expectIds: ['yeast_too_low'],
    },
    {
      label: 'very high yeast',
      profile: { doughHours: 18, yeastPct: 4.0, saltPct: 2.3, fatPct: 0, hydration: 65, flourW: 280, recipeType: 'pizza', recipeSubtype: 'napoletana' },
      expectIds: ['yeast_too_high'],
    },
    {
      label: 'extreme hydration',
      profile: { doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 0, hydration: 95, flourW: 280, recipeType: 'pizza', recipeSubtype: 'napoletana' },
      expectIds: ['hyd_extreme'],
    },
    {
      label: 'extreme duration',
      profile: { doughHours: 96, yeastPct: 0.22, saltPct: 2.3, fatPct: 0, hydration: 65, flourW: 280, recipeType: 'pizza', recipeSubtype: 'napoletana' },
      expectIds: ['hours_extreme'],
    },
  ]

  for (const { label, profile, expectIds } of profiles) {
    it(label, () => {
      const warnings = getDoughWarnings(provider, profile)
      const warningIds = warnings.map((w) => w.id)
      for (const id of expectIds) {
        expect(warningIds).toContain(id)
      }
      if (expectIds.length === 0) {
        expect(warnings).toHaveLength(0)
      }
    })
  }

  it('all warnings have messageKey (never resolved text)', () => {
    const warnings = getDoughWarnings(provider, {
      doughHours: 18, yeastPct: 0.01, saltPct: 2.3, fatPct: 0, hydration: 65, flourW: 290,
      recipeType: 'pizza', recipeSubtype: 'napoletana',
    })
    for (const w of warnings) {
      expect(w.messageKey).toBeTruthy()
      expect(typeof w.messageKey).toBe('string')
    }
  })
})
