import { describe, it, expect } from 'vitest'
import { estimateBlendW, blendFlourProperties } from '@commons/utils/flour-manager'

describe('FlourManager — estimateBlendW', () => {
  it('returns 280 for empty array', () => {
    expect(estimateBlendW([])).toBe(280)
  })

  it('returns the flour W for a single key', () => {
    expect(estimateBlendW(['gt_00_for'])).toBe(290) // gt_00_for has W=290
  })

  it('returns average for two flours', () => {
    // gt_00_deb W=130, gt_00_for W=290 → avg = 210
    expect(estimateBlendW(['gt_00_deb', 'gt_00_for'])).toBe(210)
  })

  it('handles three flours', () => {
    // gt_00_deb W=130, gt_00_med W=215, gt_00_for W=290 → avg ≈ 212
    expect(estimateBlendW(['gt_00_deb', 'gt_00_med', 'gt_00_for'])).toBe(212)
  })

  it('handles gluten-free flours with W=0', () => {
    // sp_sarac W=0, gt_00_for W=290 → avg = 145
    expect(estimateBlendW(['sp_sarac', 'gt_00_for'])).toBe(145)
  })

  it('falls back to index 5 for unknown key', () => {
    // Unknown key falls back to FLOUR_CATALOG[5] which is gt_0_for W=315
    expect(estimateBlendW(['unknown_flour'])).toBe(315)
  })
})

describe('FlourManager — blendFlourProperties with gram weights', () => {
  it('returns default when empty', () => {
    const result = blendFlourProperties([])
    expect(result.W).toBe(280)
  })

  it('returns single flour properties when only one flour', () => {
    const result = blendFlourProperties([{ id: 0, type: 'gt_00_for', g: 500, temp: null }])
    expect(result.W).toBe(290)
  })

  it('weighted average favors heavier flour', () => {
    const result = blendFlourProperties([
      { id: 0, type: 'gt_00_deb', g: 100, temp: null }, // W=130
      { id: 1, type: 'gt_00_for', g: 400, temp: null }, // W=290
    ])
    // weighted: (100*130 + 400*290) / 500 = (13000 + 116000) / 500 = 258
    expect(result.W).toBe(258)
  })

  it('equal weights match estimateBlendW', () => {
    const blended = blendFlourProperties([
      { id: 0, type: 'gt_00_deb', g: 100, temp: null },
      { id: 1, type: 'gt_00_for', g: 100, temp: null },
    ])
    const estimated = estimateBlendW(['gt_00_deb', 'gt_00_for'])
    expect(blended.W).toBe(estimated)
  })
})
