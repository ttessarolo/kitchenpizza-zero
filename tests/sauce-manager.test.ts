import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import {
  calcReductionVolume,
  calcSauceDuration,
  getSauceWarnings,
} from '@commons/utils/sauce-manager'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

describe('SauceManager', () => {
  // ── calcReductionVolume ────────────────────────────────────

  describe('calcReductionVolume', () => {
    it('reduces volume without lid', () => {
      const result = calcReductionVolume(provider, 1000, 30, false)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(1000)
    })

    it('reduces less volume with lid', () => {
      const withoutLid = calcReductionVolume(provider, 1000, 30, false)
      const withLid = calcReductionVolume(provider, 1000, 30, true)
      expect(withLid).toBeGreaterThan(withoutLid)
    })

    it('returns 0 volume at start of 0', () => {
      const result = calcReductionVolume(provider, 0, 60, false)
      expect(result).toBe(0)
    })

    it('never returns negative volume', () => {
      const result = calcReductionVolume(provider, 100, 9999, false)
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  // ── calcSauceDuration ──────────────────────────────────────

  describe('calcSauceDuration', () => {
    it('returns positive duration for sugo', () => {
      const result = calcSauceDuration(provider, 'sugo', 1000, 'simmer')
      expect(result).toBeGreaterThan(0)
    })

    it('rapid method is faster than simmer', () => {
      const simmer = calcSauceDuration(provider, 'sugo', 1000, 'simmer')
      const rapid = calcSauceDuration(provider, 'sugo', 1000, 'rapid')
      expect(rapid).toBeLessThan(simmer)
    })

    it('cold method returns minimal duration', () => {
      const result = calcSauceDuration(provider, 'pesto', 500, 'cold')
      expect(result).toBe(5)
    })

    it('scales with volume', () => {
      const small = calcSauceDuration(provider, 'ragu', 500, 'simmer')
      const large = calcSauceDuration(provider, 'ragu', 2000, 'simmer')
      expect(large).toBeGreaterThan(small)
    })

    it('handles unknown sauce type with default', () => {
      const result = calcSauceDuration(provider, 'unknown_type', 1000, 'simmer')
      expect(result).toBeGreaterThan(0)
    })
  })

  // ── getSauceWarnings ───────────────────────────────────────

  describe('getSauceWarnings', () => {
    it('fires emulsion warning when temp > 70', () => {
      const results = getSauceWarnings(provider, {
        cookTemp: 80,
        sauceType: 'emulsione',
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('sauce_temp_too_high_emulsion')
    })

    it('does not fire emulsion warning for sugo at high temp', () => {
      const results = getSauceWarnings(provider, {
        cookTemp: 80,
        sauceType: 'sugo',
      })
      const ids = results.map((r) => r.id)
      expect(ids).not.toContain('sauce_temp_too_high_emulsion')
    })

    it('fires pesto oxidation warning', () => {
      const results = getSauceWarnings(provider, {
        cookTemp: 50,
        sauceType: 'pesto',
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('sauce_pesto_oxidation')
    })

    it('fires reduction excessive warning', () => {
      const results = getSauceWarnings(provider, {
        reductionPct: 75,
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('sauce_reduction_excessive')
    })
  })
})
