/**
 * Helper for theme-reactive step colors.
 *
 * All step-type colors are defined as HSL component CSS variables
 * (e.g. `--step-dough-tx: 224 12% 40%`) and computed colors
 * (e.g. `--color-step-dough-tx: hsl(var(--step-dough-tx))`).
 *
 * Components use `stepColor(varName)` for inline styles that
 * automatically respond to dark/light mode changes.
 */

/**
 * Returns a CSS color value referencing a step-type CSS variable.
 *
 * @param varName - CSS variable base name, e.g. 'step-dough-tx'
 * @param alpha - Optional opacity (0-1). Uses HSL alpha syntax.
 *
 * @example
 * // Solid color
 * style={{ color: stepColor('step-dough-tx') }}
 * // → 'var(--color-step-dough-tx)'
 *
 * // With alpha
 * style={{ borderColor: stepColor('step-dough-tx', 0.25) }}
 * // → 'hsl(var(--step-dough-tx) / 0.25)'
 */
export function stepColor(varName: string, alpha?: number): string {
  if (alpha !== undefined) {
    return `hsl(var(--${varName}) / ${alpha})`
  }
  return `var(--color-${varName})`
}

/**
 * Returns a CSS color value for a canvas token.
 */
export function canvasColor(token: 'bg' | 'dot' | 'edge', alpha?: number): string {
  if (alpha !== undefined) {
    return `hsl(var(--canvas-${token}) / ${alpha})`
  }
  return `var(--color-canvas-${token === 'bg' ? '' : token})`.replace('--', '--')
}

/**
 * Reads a CSS variable's computed value at runtime.
 * Use only when you need the actual resolved value (e.g., for Rough.js fill).
 */
export function getCssColor(varName: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${varName}`).trim()
}

/**
 * Reads the raw HSL components from a CSS variable.
 * Returns the full `hsl(...)` string. Useful for Rough.js.
 */
export function getResolvedColor(varName: string): string {
  const hslComponents = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`).trim()
  return `hsl(${hslComponents})`
}
