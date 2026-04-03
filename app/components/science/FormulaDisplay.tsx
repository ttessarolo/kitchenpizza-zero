/**
 * FormulaDisplay — Renders MathJSON expressions as formatted LaTeX via KaTeX.
 *
 * If a pre-generated `latex` string is available, renders that directly.
 * Otherwise, generates LaTeX on-the-fly from the MathJSON expression
 * using the CortexJS Compute Engine.
 *
 * Usage:
 *   <FormulaDisplay expr={["Divide", "K", ["Power", "tempC", 2]]} />
 *   <FormulaDisplay latex="\\frac{K}{T_C^2}" />
 *   <FormulaDisplay expr={block.expr} latex={block.latex} />
 */

import { useRef, useEffect, useMemo } from 'react'
import katex from 'katex'
import { mathJSONToLatex } from '@commons/utils/science/formula-engine'
import type { MathJSON } from '@commons/utils/science/types'

interface FormulaDisplayProps {
  /** MathJSON expression — used to generate LaTeX if `latex` is not provided */
  expr?: MathJSON
  /** Pre-generated LaTeX string (preferred, avoids runtime generation) */
  latex?: string | null
  /** Display mode: true for block-level (centered), false for inline */
  displayMode?: boolean
  /** Additional CSS class */
  className?: string
  /** Fallback text if rendering fails */
  fallback?: string
}

export function FormulaDisplay({
  expr,
  latex,
  displayMode = false,
  className = '',
  fallback,
}: FormulaDisplayProps) {
  const containerRef = useRef<HTMLSpanElement>(null)

  // Resolve the LaTeX string: use provided latex, or generate from MathJSON
  const resolvedLatex = useMemo(() => {
    if (latex) return latex
    if (expr) return mathJSONToLatex(expr)
    return null
  }, [expr, latex])

  useEffect(() => {
    if (!containerRef.current || !resolvedLatex) return

    try {
      katex.render(resolvedLatex, containerRef.current, {
        displayMode,
        throwOnError: false,
        trust: true,
        strict: false,
      })
    } catch {
      // If KaTeX fails, show the raw LaTeX or MathJSON as fallback
      if (containerRef.current) {
        containerRef.current.textContent = resolvedLatex
      }
    }
  }, [resolvedLatex, displayMode])

  // Nothing to render
  if (!resolvedLatex && !expr) {
    return fallback ? <span className={className}>{fallback}</span> : null
  }

  // If no LaTeX could be resolved, show MathJSON as code
  if (!resolvedLatex) {
    return (
      <code className={`font-mono text-xs text-muted-foreground ${className}`}>
        {JSON.stringify(expr)}
      </code>
    )
  }

  return (
    <span
      ref={containerRef}
      className={`formula-display ${className}`}
    />
  )
}

/**
 * FormulaBlock — A card-style wrapper for displaying a formula with label.
 * Used in the Science admin panel for formula detail views.
 */
export function FormulaCard({
  label,
  expr,
  latex,
  className = '',
}: {
  label?: string
  expr?: MathJSON
  latex?: string | null
  className?: string
}) {
  return (
    <div className={`bg-muted rounded-lg p-3 ${className}`}>
      {label && (
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {label}
        </div>
      )}
      <FormulaDisplay expr={expr} latex={latex} displayMode />
      {expr && (
        <details className="mt-2">
          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
            MathJSON
          </summary>
          <pre className="mt-1 text-[10px] font-mono text-muted-foreground overflow-x-auto">
            {JSON.stringify(expr, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
