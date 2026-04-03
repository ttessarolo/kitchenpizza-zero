import { describe, it, expect } from 'vitest'
import {
  evaluateFormula,
  evaluateFactorChain,
  evaluatePiecewise,
  evaluateClassification,
} from '@commons/utils/science/formula-engine'
import { evaluateRules } from '@commons/utils/science/rule-engine'
import { resolveMessage } from '@commons/utils/science/i18n'
import type {
  FormulaBlock,
  FactorChainBlock,
  PiecewiseBlock,
  ClassificationBlock,
  RuleBlock,
} from '@commons/utils/science/types'

// Snapshot comparison imports
import { calcYeastPct } from '@commons/utils/dough-manager'
import { classifyStrength } from '@commons/utils/flour-manager'
import { maxRiseHoursForW } from '@commons/utils/rise-manager'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { resolve } from 'path'
import yeastJson from '../science/formulas/yeast.json'
import flourStrengthJson from '../science/classifications/flour-strength.json'
import riseCapacityJson from '../science/classifications/rise-capacity.json'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

// ═══════════════════════════════════════════════════════════════
// Formula evaluation (MathJSON expressions)
// ═══════════════════════════════════════════════════════════════

describe('FormulaEngine — evaluateFormula', () => {
  const yeastFormula: FormulaBlock = {
    type: 'formula',
    id: 'yeast_pct',
    // MathJSON: K / (REF_HYD * tempC^2 * hours)
    expr: ['Divide', 'K', ['Multiply', ['Multiply', 'REF_HYD', ['Power', 'tempC', 2]], 'hours']],
    constants: { K: 100000, REF_HYD: 56 },
    inputs: ['hours', 'tempC'],
    output: { name: 'yeastPct', unit: '%', round: 3 },
  }

  it('evaluates Casucci Formula L correctly', () => {
    const result = evaluateFormula(yeastFormula, { hours: 18, tempC: 24 })
    // K / (56 * 576 * 18) = 100000 / 580608 ≈ 0.1722...
    expect(result).toBeCloseTo(0.172, 2)
  })

  it('shorter hours = more yeast', () => {
    const short = evaluateFormula(yeastFormula, { hours: 4, tempC: 24 })
    const long = evaluateFormula(yeastFormula, { hours: 18, tempC: 24 })
    expect(short).toBeGreaterThan(long)
  })

  it('higher temp = less yeast', () => {
    const cold = evaluateFormula(yeastFormula, { hours: 18, tempC: 18 })
    const warm = evaluateFormula(yeastFormula, { hours: 18, tempC: 28 })
    expect(cold).toBeGreaterThan(warm)
  })

  it('respects output round', () => {
    const result = evaluateFormula(yeastFormula, { hours: 18, tempC: 24 })
    const decimals = String(result).split('.')[1]?.length ?? 0
    expect(decimals).toBeLessThanOrEqual(3)
  })

  it('respects output min/max clamp', () => {
    const clamped: FormulaBlock = {
      ...yeastFormula,
      output: { name: 'test', round: 2, min: 0.1, max: 5 },
    }
    const result = evaluateFormula(clamped, { hours: 1000, tempC: 24 })
    expect(result).toBeGreaterThanOrEqual(0.1)
  })
})

describe('FormulaEngine — evaluateFormula with variants', () => {
  const yeastWithVariants: FormulaBlock = {
    type: 'formula',
    id: 'yeast_pct',
    variants: [
      {
        key: 'formula_l',
        nameKey: 'variant.yeast.formula_l',
        descriptionKey: 'variant.yeast.formula_l.desc',
        // MathJSON: K / (REF_HYD * tempC^2 * hours)
        expr: ['Divide', 'K', ['Multiply', ['Multiply', 'REF_HYD', ['Power', 'tempC', 2]], 'hours']],
        constants: { K: 100000, REF_HYD: 56 },
        default: true,
      },
      {
        key: 'q10_model',
        nameKey: 'variant.yeast.q10',
        descriptionKey: 'variant.yeast.q10.desc',
        // MathJSON: baseYeast * (Q10 ^ ((Tref - tempC) / 10)) / hours
        expr: ['Divide', ['Multiply', 'baseYeast', ['Power', 'Q10', ['Divide', ['Subtract', 'Tref', 'tempC'], 10]]], 'hours'],
        constants: { baseYeast: 1.5, Q10: 2, Tref: 24 },
      },
    ],
    inputs: ['hours', 'tempC'],
    output: { name: 'yeastPct', unit: '%', round: 3 },
  }

  it('uses default variant when no key specified', () => {
    const result = evaluateFormula(yeastWithVariants, { hours: 18, tempC: 24 })
    expect(result).toBeCloseTo(0.172, 2) // Formula L
  })

  it('uses specified variant', () => {
    const formulaL = evaluateFormula(yeastWithVariants, { hours: 18, tempC: 24 }, 'formula_l')
    const q10 = evaluateFormula(yeastWithVariants, { hours: 18, tempC: 24 }, 'q10_model')
    expect(formulaL).not.toBe(q10) // Different formulas give different results
    expect(q10).toBeGreaterThan(0)
  })

  it('throws for unknown variant', () => {
    expect(() => evaluateFormula(yeastWithVariants, { hours: 18, tempC: 24 }, 'nonexistent')).toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════
// Factor chain evaluation (MathJSON expressions)
// ═══════════════════════════════════════════════════════════════

describe('FormulaEngine — evaluateFactorChain', () => {
  const simpleChain: FactorChainBlock = {
    type: 'factor_chain',
    id: 'test_chain',
    base: { value: 60, unit: 'min' },
    factors: [
      { id: 'double', expr: 2 },
      { id: 'half_yeast', expr: ['Divide', 2, ['Max', 'yeastPct', 0.5]] },
    ],
    output: { name: 'result', round: 0 },
  }

  it('multiplies base by all factors', () => {
    const result = evaluateFactorChain(simpleChain, { yeastPct: 1 })
    // 60 * 2 * (2/1) = 240
    expect(result).toBe(240)
  })

  it('handles lookup factors', () => {
    const chainWithLookup: FactorChainBlock = {
      type: 'factor_chain',
      id: 'test',
      base: { value: 60 },
      factors: [
        { id: 'method_tf', source: 'lookup', table: 'rise_methods', key: '$method', field: 'tf' },
      ],
      output: { name: 'result', round: 0 },
    }
    const catalogs = {
      rise_methods: [
        { key: 'room', tf: 1 },
        { key: 'fridge', tf: 3.6 },
      ],
    }
    const result = evaluateFactorChain(chainWithLookup, { method: 'fridge' } as any, catalogs)
    expect(result).toBe(216) // 60 * 3.6
  })

  it('handles input source factors', () => {
    const chain: FactorChainBlock = {
      type: 'factor_chain',
      id: 'test',
      base: { value: 100 },
      factors: [{ id: 'tf', source: 'input', key: 'temperatureFactor' }],
      output: { name: 'result', round: 0 },
    }
    expect(evaluateFactorChain(chain, { temperatureFactor: 0.5 })).toBe(50)
  })

  it('respects output min clamp', () => {
    const chain: FactorChainBlock = {
      type: 'factor_chain',
      id: 'test',
      base: { value: 10 },
      factors: [{ id: 'tiny', expr: 0.001 }],
      output: { name: 'result', round: 0, min: 15 },
    }
    expect(evaluateFactorChain(chain, {})).toBe(15)
  })
})

// ═══════════════════════════════════════════════════════════════
// Piecewise evaluation
// ═══════════════════════════════════════════════════════════════

describe('FormulaEngine — evaluatePiecewise', () => {
  const maxHours: PiecewiseBlock = {
    type: 'piecewise',
    id: 'max_rise_hours_for_W',
    input: 'W',
    segments: [
      { gt: 380, value: 20 },
      { gt: 320, value: 14 },
      { gt: 290, value: 10 },
      { gt: 220, value: 6 },
      { gt: 180, value: 2 },
    ],
    default: 1,
  }

  it('matches first segment (W > 380)', () => {
    expect(evaluatePiecewise(maxHours, { W: 400 })).toBe(20)
  })

  it('matches middle segment (W > 290)', () => {
    expect(evaluatePiecewise(maxHours, { W: 300 })).toBe(10)
  })

  it('falls back to default (W ≤ 180)', () => {
    expect(evaluatePiecewise(maxHours, { W: 150 })).toBe(1)
  })

  it('matches Casucci Cap. 44 table exactly', () => {
    expect(evaluatePiecewise(maxHours, { W: 390 })).toBe(20)
    expect(evaluatePiecewise(maxHours, { W: 330 })).toBe(14)
    expect(evaluatePiecewise(maxHours, { W: 295 })).toBe(10)
    expect(evaluatePiecewise(maxHours, { W: 250 })).toBe(6)
    expect(evaluatePiecewise(maxHours, { W: 190 })).toBe(2)
    expect(evaluatePiecewise(maxHours, { W: 100 })).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// Classification evaluation
// ═══════════════════════════════════════════════════════════════

describe('FormulaEngine — evaluateClassification', () => {
  const flourStrength: ClassificationBlock = {
    type: 'classification',
    id: 'flour_strength',
    input: 'W',
    classes: [
      { lt: 180, label: 'weak' },
      { lt: 260, label: 'medium' },
      { lte: 350, label: 'strong' },
      { default: true, label: 'very_strong' },
    ],
  }

  it('classifies weak flour', () => {
    expect(evaluateClassification(flourStrength, { W: 130 })).toBe('weak')
  })

  it('classifies medium flour', () => {
    expect(evaluateClassification(flourStrength, { W: 215 })).toBe('medium')
  })

  it('classifies strong flour', () => {
    expect(evaluateClassification(flourStrength, { W: 290 })).toBe('strong')
  })

  it('classifies very strong flour', () => {
    expect(evaluateClassification(flourStrength, { W: 380 })).toBe('very_strong')
  })
})

// ═══════════════════════════════════════════════════════════════
// Rule engine
// ═══════════════════════════════════════════════════════════════

describe('RuleEngine — evaluateRules', () => {
  const rules: RuleBlock[] = [
    {
      type: 'rule',
      id: 'yeast_too_low',
      category: 'yeast',
      severity: 'error',
      messageKey: 'warning.yeast_too_low',
      messageVars: ['yeastPct'],
      conditions: [
        { field: 'yeastPct', op: 'gt', value: 0 },
        { field: 'yeastPct', op: 'lt', value: 0.03 },
      ],
    },
    {
      type: 'rule',
      id: 'yeast_too_high',
      category: 'yeast',
      severity: 'warning',
      messageKey: 'warning.yeast_too_high',
      messageVars: ['yeastPct'],
      conditions: [
        { field: 'yeastPct', op: 'gt', value: 3.5 },
      ],
    },
    {
      type: 'rule',
      id: 'steam_too_long',
      category: 'steam',
      severity: 'info',
      messageKey: 'advisory.steam_too_long',
      messageVars: ['ovenCfg.steamPct', 'baseDur'],
      conditions: [
        { field: 'ovenCfg.ovenMode', op: 'eq', value: 'steam' },
        { field: 'baseDur', op: 'gt', value: 30 },
      ],
      suppressedBy: [],
      selectionMode: 'choose_one',
      actions: [
        { key: 'split', labelKey: 'action.split_steam_phases', default: true, mutations: [] },
        { key: 'reduce', labelKey: 'action.reduce_steam_pct', mutations: [] },
      ],
    },
  ]

  it('returns matching rules with messageKey (not text)', () => {
    const results = evaluateRules(rules, { yeastPct: 0.01 })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('yeast_too_low')
    expect(results[0].messageKey).toBe('warning.yeast_too_low')
    expect(results[0].messageVars.yeastPct).toBe(0.01)
  })

  it('returns no results when no conditions match', () => {
    const results = evaluateRules(rules, { yeastPct: 0.22 })
    expect(results).toHaveLength(0)
  })

  it('handles nested field access', () => {
    const results = evaluateRules(rules, {
      ovenCfg: { ovenMode: 'steam', steamPct: 100 },
      baseDur: 40,
    })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('steam_too_long')
    expect(results[0].messageVars.steamPct).toBe(100)
    expect(results[0].messageVars.baseDur).toBe(40)
  })

  it('preserves selectionMode and actions', () => {
    const results = evaluateRules(rules, {
      ovenCfg: { ovenMode: 'steam', steamPct: 100 },
      baseDur: 40,
    })
    expect(results[0].selectionMode).toBe('choose_one')
    expect(results[0].actions).toHaveLength(2)
    expect(results[0].actions![0].key).toBe('split')
  })

  it('handles suppressedBy', () => {
    const rulesWithSuppression: RuleBlock[] = [
      { ...rules[0], suppressedBy: ['yeast_too_high'] },
      rules[1],
    ]
    // Both match but yeast_too_low is suppressed by yeast_too_high (which is NOT active)
    const results = evaluateRules(rulesWithSuppression, { yeastPct: 0.01 })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('yeast_too_low')
  })
})

// ═══════════════════════════════════════════════════════════════
// i18n
// ═══════════════════════════════════════════════════════════════

describe('i18n — resolveMessage', () => {
  const it_data = {
    'warning.yeast_too_low': 'Lievito troppo basso ({{yeastPct}}%). Min: 0.03%.',
    'action.split': 'Dividi in fasi',
  }
  const en_data = {
    'warning.yeast_too_low': 'Yeast too low ({{yeastPct}}%). Min: 0.03%.',
    'action.split': 'Split phases',
  }

  it('resolves with variable interpolation', () => {
    const result = resolveMessage('warning.yeast_too_low', { yeastPct: 0.01 }, it_data)
    expect(result).toBe('Lievito troppo basso (0.01%). Min: 0.03%.')
  })

  it('falls back to fallback locale', () => {
    const result = resolveMessage('action.split', {}, {}, en_data)
    expect(result).toBe('Split phases')
  })

  it('returns key if not found', () => {
    const result = resolveMessage('nonexistent.key', {}, {})
    expect(result).toBe('nonexistent.key')
  })

  it('handles missing variables gracefully', () => {
    const result = resolveMessage('warning.yeast_too_low', {}, it_data)
    expect(result).toBe('Lievito troppo basso (%). Min: 0.03%.')
  })
})

// ═══════════════════════════════════════════════════════════════
// Snapshot: Science JSON matches hardcoded logic
// ═══════════════════════════════════════════════════════════════

describe('Snapshot — Science JSON matches manager functions', () => {
  it('yeast_pct Formula L: JSON evaluation matches calcYeastPct via provider', () => {
    const testCases = [
      { hours: 18, tempC: 24 },
      { hours: 4, tempC: 24 },
      { hours: 48, tempC: 18 },
      { hours: 2, tempC: 28 },
    ]

    for (const tc of testCases) {
      const viaManager = calcYeastPct(provider, tc.hours, 65, tc.tempC)
      const fromJson = evaluateFormula(yeastJson as unknown as FormulaBlock, { ...tc, hydration: 65 }, 'formula_l')
      expect(fromJson).toBeCloseTo(viaManager, 3)
    }
  })

  it('flour_strength classification: JSON evaluation matches classifyStrength via provider', () => {
    const testCases = [130, 180, 215, 260, 290, 350, 380, 400]
    for (const W of testCases) {
      const viaManager = classifyStrength(provider, W)
      const fromJson = evaluateClassification(flourStrengthJson as ClassificationBlock, { W })
      expect(fromJson).toBe(viaManager)
    }
  })

  it('max_rise_hours: JSON evaluation matches maxRiseHoursForW via provider', () => {
    const testCases = [100, 180, 190, 220, 250, 290, 300, 320, 330, 380, 400]
    for (const W of testCases) {
      const viaManager = maxRiseHoursForW(provider, W)
      const fromJson = evaluatePiecewise(riseCapacityJson as PiecewiseBlock, { W })
      expect(fromJson).toBe(viaManager)
    }
  })
})
