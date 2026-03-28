/**
 * FormulaEngine — Interprets CookingScienceBrain JSON blocks at runtime.
 *
 * Uses expr-eval for mathematical expression evaluation.
 * Supports: formula, factor_chain, piecewise, classification.
 */

import { Parser } from 'expr-eval'
import type {
  FormulaBlock,
  FactorChainBlock,
  PiecewiseBlock,
  PiecewiseSegment,
  ClassificationBlock,
  ClassificationClass,
  OutputSpec,
} from './types'

const parser = new Parser()

// ── Output post-processing ─────────────────────────────────────

function applyOutput(value: number, output?: OutputSpec): number {
  if (!output) return value
  let result = value
  if (output.min !== undefined) result = Math.max(result, output.min)
  if (output.max !== undefined) result = Math.min(result, output.max)
  if (output.round !== undefined) {
    const factor = Math.pow(10, output.round)
    result = Math.round(result * factor) / factor
  }
  return result
}

// ── Formula evaluation ─────────────────────────────────────────

/**
 * Evaluate a formula block with the given input variables.
 * If variants exist, uses the specified variant key or the default variant.
 */
export function evaluateFormula(
  block: FormulaBlock,
  inputs: Record<string, number>,
  variantKey?: string,
): number {
  let expression: string
  let constants: Record<string, number> = {}

  if (block.variants && block.variants.length > 0) {
    const variant = variantKey
      ? block.variants.find((v) => v.key === variantKey)
      : block.variants.find((v) => v.default) ?? block.variants[0]
    if (!variant) throw new Error(`Variant "${variantKey}" not found for formula "${block.id}"`)
    expression = variant.expression
    constants = variant.constants ?? {}
  } else if (block.expression) {
    expression = block.expression
    constants = block.constants ?? {}
  } else {
    throw new Error(`Formula "${block.id}" has no expression or variants`)
  }

  const vars = { ...constants, ...inputs }
  const expr = parser.parse(expression)
  const result = expr.evaluate(vars)
  return applyOutput(result, block.output)
}

// ── Factor chain evaluation ────────────────────────────────────

/**
 * Evaluate a factor chain: base × f1 × f2 × ... × fN.
 * Each factor can be an expression, a lookup from a catalog, or a direct input.
 *
 * @param catalogs — record of catalog name → entries array (for lookup factors)
 */
export function evaluateFactorChain(
  block: FactorChainBlock,
  inputs: Record<string, number>,
  catalogs?: Record<string, Record<string, unknown>[]>,
): number {
  let result = block.base.value

  for (const factor of block.factors) {
    let factorValue: number

    if (factor.source === 'lookup' && factor.table && factor.key && factor.field) {
      // Lookup from catalog
      const lookupKey = factor.key.startsWith('$')
        ? String(inputs[factor.key.slice(1)] ?? '')
        : factor.key
      const catalog = catalogs?.[factor.table] ?? []
      const entry = catalog.find((e) => (e as Record<string, unknown>).key === lookupKey) as Record<string, unknown> | undefined
      factorValue = Number(entry?.[factor.field] ?? 1)
    } else if (factor.source === 'input' && factor.key) {
      // Direct input value
      factorValue = inputs[factor.key] ?? 1
    } else if (factor.expression) {
      // Expression evaluation
      const expr = parser.parse(factor.expression)
      factorValue = expr.evaluate(inputs)
    } else {
      factorValue = 1
    }

    result *= factorValue
  }

  return applyOutput(result, block.output)
}

// ── Piecewise evaluation ───────────────────────────────────────

function matchesSegment(segment: PiecewiseSegment, value: unknown): boolean {
  const num = Number(value)
  if (segment.gt !== undefined && !(num > segment.gt)) return false
  if (segment.gte !== undefined && !(num >= segment.gte)) return false
  if (segment.lt !== undefined && !(num < segment.lt)) return false
  if (segment.lte !== undefined && !(num <= segment.lte)) return false
  if (segment.eq !== undefined && value !== segment.eq) return false
  return true
}

/**
 * Evaluate a piecewise (step) function.
 * Tests segments in order — first match wins.
 */
export function evaluatePiecewise(
  block: PiecewiseBlock,
  inputs: Record<string, unknown>,
): unknown {
  const inputValue = inputs[block.input]

  for (const segment of block.segments) {
    if (segment.default) continue
    if (matchesSegment(segment, inputValue)) return segment.value
  }

  return block.default
}

// ── Classification evaluation ──────────────────────────────────

function matchesClass(cls: ClassificationClass, value: number): boolean {
  if (cls.default) return false // handled separately
  if (cls.lt !== undefined && !(value < cls.lt)) return false
  if (cls.lte !== undefined && !(value <= cls.lte)) return false
  if (cls.gt !== undefined && !(value > cls.gt)) return false
  if (cls.gte !== undefined && !(value >= cls.gte)) return false
  return true
}

/**
 * Classify a value into one of the defined classes.
 * Tests classes in order — first match wins. Falls back to default class.
 */
export function evaluateClassification(
  block: ClassificationBlock,
  inputs: Record<string, number>,
): string {
  const inputValue = inputs[block.input]

  for (const cls of block.classes) {
    if (cls.default) continue
    if (matchesClass(cls, inputValue)) return cls.label
  }

  // Return default class
  const defaultClass = block.classes.find((c) => c.default)
  return defaultClass?.label ?? 'unknown'
}
