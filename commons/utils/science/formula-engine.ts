/**
 * FormulaEngine — Interprets CookingScienceBrain JSON blocks at runtime.
 *
 * Uses CortexJS Compute Engine for MathJSON expression evaluation.
 * Supports: formula, factor_chain, piecewise, classification.
 */

import { ComputeEngine } from '@cortex-js/compute-engine'
import type {
  MathJSON,
  FormulaBlock,
  FactorChainBlock,
  PiecewiseBlock,
  PiecewiseSegment,
  ClassificationBlock,
  ClassificationClass,
  OutputSpec,
} from './types'

// ── Lazy-initialized Compute Engine ───────────────────────────────
// Initialized on first use to avoid crashing in jsdom environments
// where the CortexJS internal type parser has issues.

let _ce: InstanceType<typeof ComputeEngine> | null = null

function getCE(): InstanceType<typeof ComputeEngine> {
  if (!_ce) {
    _ce = new ComputeEngine()
    try {
      _ce.declare('Clamp', {
        signature: '(value: Numbers, low: Numbers, high: Numbers) -> Numbers',
      })
    } catch {
      // CortexJS type parser may fail in some environments (e.g., jsdom).
      // Clamp will still work via assign below.
    }
    _ce.assign('Clamp', ([val, lo, hi]: any[]) => {
      const v = val.valueOf() as number
      const l = lo.valueOf() as number
      const h = hi.valueOf() as number
      return _ce!.number(Math.max(l, Math.min(h, v)))
    })
  }
  return _ce
}

// ── MathJSON evaluation helper ──────────────────────────────────

/**
 * Evaluate a MathJSON expression with the given variable bindings.
 * Variables can be numbers or strings (string vars are resolved from inputs).
 */
function evaluateMathJSON(
  expr: MathJSON,
  inputs: Record<string, number>,
): number {
  const ce = getCE()

  // Pre-process MathJSON: substitute variables and wrap Max/Min args in List.
  // CortexJS 0.26+ requires Max/Min to take a List argument, not variadic args.
  function preprocess(node: any): any {
    if (typeof node === 'string' && node in inputs) {
      return inputs[node]
    }
    if (Array.isArray(node)) {
      const [head, ...args] = node
      const processed = args.map(preprocess)
      // Wrap Max/Min arguments in List if not already wrapped
      if ((head === 'Max' || head === 'Min') && processed.length > 0) {
        if (processed.length === 1 && Array.isArray(processed[0]) && processed[0][0] === 'List') {
          return [head, ...processed] // already List-wrapped
        }
        return [head, ['List', ...processed]]
      }
      return [head, ...processed]
    }
    return node
  }

  const substituted = preprocess(expr)

  try {
    const boxed = ce.box(substituted as any)
    const result = boxed.N()
    const num = result.valueOf()
    if (typeof num === 'number' && !Number.isNaN(num)) {
      return num
    }
    // Try numericValue for complex expression results
    const nv = result.numericValue
    if (typeof nv === 'number') return nv
    throw new Error(`MathJSON evaluation returned non-numeric: ${JSON.stringify(num)}`)
  } catch (err) {
    throw err
  }
}

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
  let expr: MathJSON
  let constants: Record<string, number> = {}

  if (block.variants && block.variants.length > 0) {
    const variant = variantKey
      ? block.variants.find((v) => v.key === variantKey)
      : block.variants.find((v) => v.default) ?? block.variants[0]
    if (!variant) throw new Error(`Variant "${variantKey}" not found for formula "${block.id}"`)
    expr = variant.expr
    constants = variant.constants ?? {}
  } else if (block.expr) {
    expr = block.expr
    constants = block.constants ?? {}
  } else {
    throw new Error(`Formula "${block.id}" has no expr or variants`)
  }

  const vars = { ...constants, ...inputs }
  const result = evaluateMathJSON(expr, vars)
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
    } else if (factor.expr) {
      // MathJSON expression evaluation
      factorValue = evaluateMathJSON(factor.expr, inputs)
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
 * If a matching segment has an expr (MathJSON), evaluates it with inputs.
 */
export function evaluatePiecewise(
  block: PiecewiseBlock,
  inputs: Record<string, unknown>,
): unknown {
  const inputValue = inputs[block.input]

  for (const segment of block.segments) {
    if (segment.default) continue
    if (matchesSegment(segment, inputValue)) {
      // If segment has a MathJSON expression, evaluate it
      if (segment.expr) {
        const numInputs: Record<string, number> = {}
        for (const [k, v] of Object.entries(inputs)) {
          if (typeof v === 'number') numInputs[k] = v
        }
        return evaluateMathJSON(segment.expr, numInputs)
      }
      return segment.value
    }
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

// ── Re-export the Compute Engine for LaTeX generation ──────────

/**
 * Generate LaTeX string from a MathJSON expression.
 * Useful for UI rendering with KaTeX.
 */
export function mathJSONToLatex(expr: MathJSON): string | null {
  try {
    const boxed = getCE().box(expr as any)
    return boxed.latex
  } catch {
    return null
  }
}

export { getCE as getComputeEngine }
