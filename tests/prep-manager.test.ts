import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import {
  calcSafeRoomTime,
  calcPrepDuration,
  getPrepWarnings,
} from '@commons/utils/prep-layer-manager'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

describe('PrepLayerManager', () => {
  // ── calcSafeRoomTime ───────────────────────────────────────

  describe('calcSafeRoomTime', () => {
    it('returns 120 min for raw protein', () => {
      const result = calcSafeRoomTime(provider, 'protein', false)
      expect(result).toBe(120)
    })

    it('returns 60 min for raw dairy', () => {
      const result = calcSafeRoomTime(provider, 'dairy', false)
      expect(result).toBe(60)
    })

    it('cooked ingredients get 50% more time', () => {
      const raw = calcSafeRoomTime(provider, 'protein', false)
      const cooked = calcSafeRoomTime(provider, 'protein', true)
      expect(cooked).toBe(Math.round(raw * 1.5))
    })

    it('returns default for unknown category', () => {
      const result = calcSafeRoomTime(provider, 'spice', false)
      expect(result).toBe(120) // default fallback
    })

    it('vegetables get more time than protein', () => {
      const protein = calcSafeRoomTime(provider, 'protein', false)
      const vegetable = calcSafeRoomTime(provider, 'vegetable', false)
      expect(vegetable).toBeGreaterThan(protein)
    })
  })

  // ── calcPrepDuration ───────────────────────────────────────

  describe('calcPrepDuration', () => {
    it('brunoise is slower than slice', () => {
      const brunoise = calcPrepDuration(provider, 'brunoise', 500)
      const slice = calcPrepDuration(provider, 'slice', 500)
      expect(brunoise).toBeGreaterThan(slice)
    })

    it('scales with quantity', () => {
      const small = calcPrepDuration(provider, 'dice', 200)
      const large = calcPrepDuration(provider, 'dice', 1000)
      expect(large).toBeGreaterThan(small)
    })

    it('returns at least 1 minute', () => {
      const result = calcPrepDuration(provider, 'rough', 10)
      expect(result).toBeGreaterThanOrEqual(1)
    })

    it('handles unknown cut style with default speed', () => {
      const result = calcPrepDuration(provider, 'unknown_cut', 500)
      expect(result).toBeGreaterThan(0)
    })
  })

  // ── getPrepWarnings ────────────────────────────────────────

  describe('getPrepWarnings', () => {
    it('fires error for protein at room temp too long', () => {
      const results = getPrepWarnings(provider, {
        roomTempMinutes: 150,
        ingredientCategory: 'protein',
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('prep_protein_room_temp')
      expect(results.find((r) => r.id === 'prep_protein_room_temp')?.severity).toBe('error')
    })

    it('fires error for dairy at room temp > 120 min', () => {
      const results = getPrepWarnings(provider, {
        roomTempMinutes: 150,
        ingredientCategory: 'dairy',
      })
      const ids = results.map((r) => r.id)
      // dairy is in the ["protein", "dairy"] array, so protein_room_temp fires
      expect(ids).toContain('prep_protein_room_temp')
    })

    it('fires cross contamination warning', () => {
      const results = getPrepWarnings(provider, {
        rawProteinThenVegetable: true,
        washBetween: false,
      })
      const ids = results.map((r) => r.id)
      expect(ids).toContain('prep_cross_contamination')
    })

    it('does not fire cross contamination when washed', () => {
      const results = getPrepWarnings(provider, {
        rawProteinThenVegetable: true,
        washBetween: true,
      })
      const ids = results.map((r) => r.id)
      expect(ids).not.toContain('prep_cross_contamination')
    })

    it('no warnings for safe conditions', () => {
      const results = getPrepWarnings(provider, {
        roomTempMinutes: 30,
        ingredientCategory: 'vegetable',
        rawProteinThenVegetable: false,
        washBetween: true,
      })
      expect(results).toHaveLength(0)
    })
  })
})
