/**
 * Snapshot tests — verify that Science JSON produces identical results
 * to the hardcoded manager functions.
 *
 * These tests ensure zero regressions during the migration from
 * hardcoded logic to externalized JSON.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { FileScienceProvider, type ScienceProvider } from '@commons/utils/science/science-provider'
import {
  calcYeastPct,
  calcYeastPctScience,
  getDoughWarnings,
  getDoughWarningsScience,
  type DoughProfileInput,
} from '@commons/utils/dough-manager'
import {
  maxRiseHoursForW,
  maxRiseHoursForWScience,
} from '@commons/utils/rise-manager'
import {
  classifyStrength,
  classifyStrengthScience,
} from '@commons/utils/flour-manager'
import * as path from 'path'

let provider: ScienceProvider

beforeAll(() => {
  provider = new FileScienceProvider(
    path.resolve(process.cwd(), 'science'),
    path.resolve(process.cwd(), 'i18n'),
  )
})

// ═══════════════════════════════════════════════════════════════
// Yeast calculation
// ═══════════════════════════════════════════════════════════════

describe('Snapshot — calcYeastPct: hardcoded vs science', () => {
  const testCases = [
    { hours: 18, tempC: 24 },
    { hours: 4, tempC: 24 },
    { hours: 48, tempC: 18 },
    { hours: 2, tempC: 28 },
    { hours: 72, tempC: 4 },
    { hours: 1, tempC: 30 },
  ]

  for (const tc of testCases) {
    it(`hours=${tc.hours}, tempC=${tc.tempC}`, () => {
      const hardcoded = calcYeastPct(tc.hours, 60, tc.tempC)
      const science = calcYeastPctScience(provider, tc.hours, tc.tempC, 'formula_l')
      expect(science).toBeCloseTo(hardcoded, 3)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// Max rise hours
// ═══════════════════════════════════════════════════════════════

describe('Snapshot — maxRiseHoursForW: hardcoded vs science', () => {
  const testCases = [100, 180, 190, 220, 250, 290, 300, 320, 330, 380, 400]

  for (const W of testCases) {
    it(`W=${W}`, () => {
      const hardcoded = maxRiseHoursForW(W)
      const science = maxRiseHoursForWScience(provider, W)
      expect(science).toBe(hardcoded)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// Flour classification
// ═══════════════════════════════════════════════════════════════

describe('Snapshot — classifyStrength: hardcoded vs science', () => {
  const testCases = [60, 130, 179, 180, 215, 259, 260, 290, 350, 351, 380, 420]

  for (const W of testCases) {
    it(`W=${W}`, () => {
      const hardcoded = classifyStrength(W)
      const science = classifyStrengthScience(provider, W)
      expect(science).toBe(hardcoded)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// Dough warnings
// ═══════════════════════════════════════════════════════════════

describe('Snapshot — getDoughWarnings: hardcoded vs science', () => {
  const profiles: DoughProfileInput[] = [
    { doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 0, hydration: 65, recipeType: 'pizza', recipeSubtype: 'napoletana' },
    { doughHours: 18, yeastPct: 0.01, saltPct: 2.3, fatPct: 0, hydration: 65, recipeType: 'pizza', recipeSubtype: 'napoletana' },
    { doughHours: 18, yeastPct: 4.0, saltPct: 2.3, fatPct: 0, hydration: 65, recipeType: 'pizza', recipeSubtype: 'napoletana' },
    { doughHours: 18, yeastPct: 0.22, saltPct: 3.5, fatPct: 0, hydration: 65, recipeType: 'pizza', recipeSubtype: 'napoletana' },
    { doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 15, hydration: 65, recipeType: 'pizza', recipeSubtype: 'napoletana' },
    { doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 0, hydration: 95, recipeType: 'pizza', recipeSubtype: 'napoletana' },
    { doughHours: 96, yeastPct: 0.22, saltPct: 2.3, fatPct: 0, hydration: 65, recipeType: 'pizza', recipeSubtype: 'napoletana' },
  ]

  for (const profile of profiles) {
    const label = `yeast=${profile.yeastPct} salt=${profile.saltPct} fat=${profile.fatPct} hyd=${profile.hydration} hours=${profile.doughHours}`

    it(`${label}: same warning count`, () => {
      const hardcoded = getDoughWarnings(profile)
      const science = getDoughWarningsScience(provider, profile)
      expect(science.length).toBe(hardcoded.length)
    })

    it(`${label}: same warning IDs`, () => {
      const hardcoded = getDoughWarnings(profile).map((w) => w.id).sort()
      const science = getDoughWarningsScience(provider, profile).map((w) => w.id).sort()
      expect(science).toEqual(hardcoded)
    })
  }
})
