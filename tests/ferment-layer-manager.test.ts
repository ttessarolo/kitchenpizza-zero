import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import {
  calcBrineConcentration,
  calcFermentDuration,
  getFermentWarnings,
} from '@commons/utils/ferment-layer-manager'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

describe('FermentLayerManager', () => {
  // ── calcBrineConcentration ─────────────────────────────────

  describe('calcBrineConcentration', () => {
    it('calculates correct salt percentage', () => {
      // 20g salt + 480g vegetables + 500g water = 1000g total → 2%
      const result = calcBrineConcentration(provider, 20, 480, 500)
      expect(result.pct).toBe(2)
      expect(result.safe).toBe(true)
    })

    it('flags unsafe when salt is too low', () => {
      // 5g salt + 495g veg + 500g water = 1000g → 0.5%
      const result = calcBrineConcentration(provider, 5, 495, 500)
      expect(result.pct).toBe(0.5)
      expect(result.safe).toBe(false)
    })

    it('handles dry-salt fermentation (no water)', () => {
      // 30g salt + 970g vegetables = 1000g → 3%
      const result = calcBrineConcentration(provider, 30, 970, 0)
      expect(result.pct).toBe(3)
      expect(result.safe).toBe(true)
    })

    it('handles zero total weight', () => {
      const result = calcBrineConcentration(provider, 0, 0, 0)
      expect(result.pct).toBe(0)
      expect(result.safe).toBe(false)
    })
  })

  // ── calcFermentDuration ────────────────────────────────────

  describe('calcFermentDuration', () => {
    it('returns longer duration at cold temperatures', () => {
      const cold = calcFermentDuration(provider, 'lattofermentazione', 8, 3)
      const warm = calcFermentDuration(provider, 'lattofermentazione', 22, 3)
      expect(cold.minDays).toBeGreaterThan(warm.minDays)
    })

    it('returns minDays <= maxDays', () => {
      const result = calcFermentDuration(provider, 'kimchi', 20, 3)
      expect(result.minDays).toBeLessThanOrEqual(result.maxDays)
    })

    it('high salt slows fermentation', () => {
      const lowSalt = calcFermentDuration(provider, 'lattofermentazione', 20, 2.5)
      const highSalt = calcFermentDuration(provider, 'lattofermentazione', 20, 6)
      expect(highSalt.minDays).toBeGreaterThanOrEqual(lowSalt.minDays)
    })

    it('returns positive values at room temperature', () => {
      const result = calcFermentDuration(provider, 'salamoia', 22, 3.5)
      expect(result.minDays).toBeGreaterThan(0)
      expect(result.maxDays).toBeGreaterThan(0)
    })
  })

  // ── getFermentWarnings ─────────────────────────────────────

  describe('getFermentWarnings', () => {
    it('fires error when salt too low for lacto-ferment', () => {
      const results = getFermentWarnings(provider, {
        saltPercentage: 1,
        fermentType: 'lattofermentazione',
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('ferment_salt_too_low')
      expect(results.find((r) => r.id === 'ferment_salt_too_low')?.severity).toBe('error')
    })

    it('does not fire salt error for non-lacto ferment', () => {
      const results = getFermentWarnings(provider, {
        saltPercentage: 0,
        fermentType: 'kombucha',
      })
      const ids = results.map((r) => r.id)
      expect(ids).not.toContain('ferment_salt_too_low')
    })

    it('fires warning when temp > 30', () => {
      const results = getFermentWarnings(provider, {
        temperature: 35,
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('ferment_temp_too_high')
    })

    it('fires pH warning after 2 days', () => {
      const results = getFermentWarnings(provider, {
        currentPH: 5.0,
        daysSinceStart: 5,
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('ferment_ph_not_reached')
    })
  })
})
