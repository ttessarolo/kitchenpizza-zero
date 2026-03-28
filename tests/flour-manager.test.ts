import { describe, it, expect } from 'vitest'
import {
  FLOUR_CATALOG,
  FLOUR_GROUPS,
  getFlour,
  getFloursByGroup,
  searchFlours,
  blendFlourProperties,
  estimateW,
  classifyStrength,
  isWholeGrain,
  isGlutenFree,
  suggestForW,
} from '@commons/utils/flour-manager'
import type { FlourIngredient } from '@commons/types/recipe'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { resolve } from 'path'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

const makeFlour = (type: string, g: number): FlourIngredient => ({ id: 0, type, g, temp: null })

// ═══════════════════════════════════════════════════════════════
// Catalog data integrity
// ═══════════════════════════════════════════════════════════════

describe('FlourManager — catalog integrity', () => {
  it('has all three groups', () => {
    expect(FLOUR_GROUPS).toContain('flour_group_grano_tenero')
    expect(FLOUR_GROUPS).toContain('flour_group_grano_duro')
    expect(FLOUR_GROUPS).toContain('flour_group_speciali')
  })

  it('every flour belongs to a valid group', () => {
    for (const f of FLOUR_CATALOG) {
      expect(FLOUR_GROUPS).toContain(f.groupKey)
    }
  })

  it('every flour has valid W range', () => {
    for (const f of FLOUR_CATALOG) {
      expect(f.W).toBeGreaterThanOrEqual(0)
      expect(f.W).toBeLessThanOrEqual(420)
    }
  })

  it('every flour has valid protein range', () => {
    for (const f of FLOUR_CATALOG) {
      expect(f.protein).toBeGreaterThanOrEqual(5)
      expect(f.protein).toBeLessThanOrEqual(16)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// Catalog lookup
// ═══════════════════════════════════════════════════════════════

describe('FlourManager — getFlour', () => {
  it('finds flour by key', () => {
    const f = getFlour('gt_00_for')
    expect(f.key).toBe('gt_00_for')
    expect(f.labelKey).toBe('flour_gt_00_for')
  })

  it('returns fallback for unknown key', () => {
    const f = getFlour('unknown_key')
    expect(f).toBeDefined()
    expect(f.key).toBeTruthy()
  })
})

describe('FlourManager — getFloursByGroup', () => {
  it('returns only Grano Tenero flours', () => {
    const gt = getFloursByGroup('flour_group_grano_tenero')
    expect(gt.length).toBeGreaterThan(0)
    expect(gt.every((f) => f.groupKey === 'flour_group_grano_tenero')).toBe(true)
  })

  it('returns only Grano Duro flours', () => {
    const gd = getFloursByGroup('flour_group_grano_duro')
    expect(gd.length).toBe(3)
    expect(gd.every((f) => f.groupKey === 'flour_group_grano_duro')).toBe(true)
  })

  it('returns empty for unknown group', () => {
    expect(getFloursByGroup('Nonexistent')).toHaveLength(0)
  })
})

describe('FlourManager — searchFlours', () => {
  it('finds by labelKey', () => {
    const results = searchFlours('flour_gt_manit')
    expect(results.length).toBe(1)
    expect(results[0].key).toBe('gt_manit')
  })

  it('finds by subKey', () => {
    const results = searchFlours('flour_sp_sarac_sub')
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('case insensitive', () => {
    expect(searchFlours('FLOUR_GT_MANIT').length).toBe(1)
  })

  it('returns empty for no match', () => {
    expect(searchFlours('xyznonexistent')).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// Blending
// ═══════════════════════════════════════════════════════════════

describe('FlourManager — blendFlourProperties', () => {
  it('returns defaults for empty array', () => {
    const bp = blendFlourProperties([])
    expect(bp.W).toBe(280)
    expect(bp.protein).toBe(12)
  })

  it('returns exact values for single flour', () => {
    const flour = getFlour('gt_00_for')
    const bp = blendFlourProperties([makeFlour('gt_00_for', 500)])
    expect(bp.W).toBe(flour.W)
    expect(bp.protein).toBeCloseTo(flour.protein, 0)
  })

  it('50/50 blend gives average W', () => {
    const f1 = getFlour('gt_00_deb') // W=130
    const f2 = getFlour('gt_00_for') // W=290
    const bp = blendFlourProperties([makeFlour('gt_00_deb', 500), makeFlour('gt_00_for', 500)])
    expect(bp.W).toBe(Math.round((f1.W + f2.W) / 2)) // 210
  })

  it('80/20 blend weights heavier flour more', () => {
    getFlour('gt_00_for') // W=290
    const bp = blendFlourProperties([makeFlour('gt_00_for', 800), makeFlour('gt_00_deb', 200)])
    // Should be closer to 290 than to 130
    expect(bp.W).toBeGreaterThan(250)
  })
})

// ═══════════════════════════════════════════════════════════════
// estimateW
// ═══════════════════════════════════════════════════════════════

describe('FlourManager — estimateW', () => {
  it('estimates W for typical protein levels', () => {
    expect(estimateW(12)).toBe(194)
    expect(estimateW(14)).toBe(238)
  })

  it('clamps to [60, 420]', () => {
    expect(estimateW(5)).toBe(60)
    expect(estimateW(25)).toBe(420)
  })
})

// ═══════════════════════════════════════════════════════════════
// Classification
// ═══════════════════════════════════════════════════════════════

describe('FlourManager — classifyStrength', () => {
  it('classifies weak flour (W < 180)', () => {
    expect(classifyStrength(provider, 130)).toBe('weak')
  })

  it('classifies medium flour (180-260)', () => {
    expect(classifyStrength(provider, 215)).toBe('medium')
  })

  it('classifies strong flour (260-350)', () => {
    expect(classifyStrength(provider, 290)).toBe('strong')
  })

  it('classifies very_strong flour (> 350)', () => {
    expect(classifyStrength(provider, 380)).toBe('very_strong')
  })
})

describe('FlourManager — isWholeGrain', () => {
  it('detects whole grain (fiber > 6)', () => {
    expect(isWholeGrain(getFlour('gt_int'))).toBe(true) // fiber 9
    expect(isWholeGrain(getFlour('gt_00_for'))).toBe(false) // fiber 2.2
  })
})

describe('FlourManager — isGlutenFree', () => {
  it('detects gluten-free (W=0, fermentSpeed=0)', () => {
    expect(isGlutenFree(getFlour('sp_sarac'))).toBe(true)
    expect(isGlutenFree(getFlour('sp_riso'))).toBe(true)
    expect(isGlutenFree(getFlour('gt_00_for'))).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// Suggestions
// ═══════════════════════════════════════════════════════════════

describe('FlourManager — suggestForW', () => {
  it('suggests flours near target W', () => {
    const results = suggestForW(280)
    expect(results.length).toBeGreaterThan(0)
    // First result should be closest to 280
    expect(Math.abs(results[0].W - 280)).toBeLessThanOrEqual(50)
  })

  it('sorts by distance from target', () => {
    const results = suggestForW(290)
    for (let i = 1; i < results.length; i++) {
      expect(Math.abs(results[i].W - 290)).toBeGreaterThanOrEqual(Math.abs(results[i - 1].W - 290))
    }
  })

  it('excludes gluten-free flours (W=0)', () => {
    const results = suggestForW(50, undefined, 100)
    expect(results.every((f) => f.W > 0)).toBe(true)
  })

  it('respects tolerance', () => {
    const narrow = suggestForW(290, undefined, 10)
    const wide = suggestForW(290, undefined, 100)
    expect(wide.length).toBeGreaterThanOrEqual(narrow.length)
  })
})
