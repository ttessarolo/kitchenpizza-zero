import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import {
  validateTemperingCurve,
  checkCustardPasteurization,
  calcMeringueRatio,
  getPastryWarnings,
} from '@commons/utils/pastry-manager'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

describe('PastryManager', () => {
  // ── validateTemperingCurve ─────────────────────────────────

  describe('validateTemperingCurve', () => {
    it('validates correct dark chocolate tempering', () => {
      const result = validateTemperingCurve(provider, 'dark', 55, 27, 31.5)
      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('rejects too-hot dark chocolate', () => {
      const result = validateTemperingCurve(provider, 'dark', 55, 27, 35)
      expect(result.valid).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('warns when work temp is too cold', () => {
      const result = validateTemperingCurve(provider, 'dark', 55, 25, 25)
      expect(result.valid).toBe(false)
      expect(result.warnings).toContain('work_temp_too_cold')
    })

    it('warns when melt temp is below work temp', () => {
      const result = validateTemperingCurve(provider, 'dark', 30, 27, 31.5)
      expect(result.warnings).toContain('melt_temp_below_work')
    })

    it('warns when cool temp is above work temp', () => {
      const result = validateTemperingCurve(provider, 'dark', 55, 33, 31.5)
      expect(result.warnings).toContain('cool_temp_above_work')
    })

    it('returns error for unknown chocolate type', () => {
      const result = validateTemperingCurve(provider, 'ruby', 55, 27, 31)
      expect(result.valid).toBe(false)
      expect(result.warnings).toContain('unknown_chocolate_type')
    })
  })

  // ── checkCustardPasteurization ─────────────────────────────

  describe('checkCustardPasteurization', () => {
    it('is safe when temp >= 82 and has eggs', () => {
      const result = checkCustardPasteurization(provider, 85, 15, true)
      expect(result.safe).toBe(true)
    })

    it('is unsafe when temp < 82 and has eggs', () => {
      const result = checkCustardPasteurization(provider, 75, 30, true)
      expect(result.safe).toBe(false)
    })

    it('is unsafe when duration is too short', () => {
      const result = checkCustardPasteurization(provider, 85, 5, true)
      expect(result.safe).toBe(false)
    })

    it('is safe when no eggs regardless of temp', () => {
      const result = checkCustardPasteurization(provider, 50, 5, false)
      expect(result.safe).toBe(true)
    })
  })

  // ── calcMeringueRatio ──────────────────────────────────────

  describe('calcMeringueRatio', () => {
    it('stable when ratio >= 1.5', () => {
      // 100g egg whites + 200g sugar = ratio 2.0
      const result = calcMeringueRatio(provider, 100, 200)
      expect(result.ratio).toBe(2)
      expect(result.stable).toBe(true)
    })

    it('unstable when ratio < 1.5', () => {
      // 100g egg whites + 100g sugar = ratio 1.0
      const result = calcMeringueRatio(provider, 100, 100)
      expect(result.ratio).toBe(1)
      expect(result.stable).toBe(false)
    })

    it('handles zero egg whites', () => {
      const result = calcMeringueRatio(provider, 0, 100)
      expect(result.ratio).toBe(0)
      expect(result.stable).toBe(false)
    })

    it('boundary: exactly 1.5 is stable', () => {
      const result = calcMeringueRatio(provider, 100, 150)
      expect(result.ratio).toBe(1.5)
      expect(result.stable).toBe(true)
    })
  })

  // ── getPastryWarnings ──────────────────────────────────────

  describe('getPastryWarnings', () => {
    it('fires error for dark chocolate too hot', () => {
      const results = getPastryWarnings(provider, {
        workTemp: 35,
        chocolateType: 'dark',
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('pastry_temper_dark_too_hot')
      expect(results.find((r) => r.id === 'pastry_temper_dark_too_hot')?.severity).toBe('error')
    })

    it('fires error for custard not pasteurized', () => {
      const results = getPastryWarnings(provider, {
        cookTemp: 75,
        hasEggs: true,
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('pastry_custard_not_pasteurized')
    })

    it('fires warning for unstable meringue', () => {
      const results = getPastryWarnings(provider, {
        sugarEggRatio: 1.0,
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('pastry_meringue_unstable')
    })
  })
})
