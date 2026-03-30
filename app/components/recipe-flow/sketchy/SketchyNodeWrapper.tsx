import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react'
import rough from 'roughjs'

interface SketchyNodeWrapperProps {
  children: ReactNode
  width: number
  height?: number
  fillColor: string      // CSS var name e.g. 'step-dough-bg'
  strokeColor: string    // CSS var name e.g. 'step-dough-tx'
  strokeWidth?: number
  roughness?: number
  seed: number
  fillStyle?: 'solid' | 'hachure' | 'cross-hatch'
  className?: string
  pulse?: boolean
}

/** Convert a string to a stable numeric seed */
export function hashStringToNumber(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit int
  }
  return Math.abs(hash)
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
}

function resolveColor(varName: string): string {
  if (typeof document === 'undefined') return 'transparent'
  const hsl = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`).trim()
  return hsl ? `hsl(${hsl})` : 'transparent'
}

export function SketchyNodeWrapper({
  children,
  width,
  height: heightProp,
  fillColor,
  strokeColor,
  strokeWidth = 2,
  roughness = 1.2,
  seed,
  fillStyle = 'solid',
  className = '',
  pulse = false,
}: SketchyNodeWrapperProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [resolvedHeight, setResolvedHeight] = useState(heightProp ?? 0)
  const [themeKey, setThemeKey] = useState(0)

  // Observe wrapper height
  useEffect(() => {
    if (heightProp !== undefined) {
      setResolvedHeight(heightProp)
      return
    }
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setResolvedHeight(Math.ceil(entry.contentRect.height))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [heightProp])

  // Theme change observer
  useEffect(() => {
    if (typeof document === 'undefined') return
    const observer = new MutationObserver(() => {
      setThemeKey((k) => k + 1)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  // Draw rough rectangle
  const draw = useCallback(() => {
    const svg = svgRef.current
    if (!svg || resolvedHeight === 0) return

    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild)
    }

    const rc = rough.svg(svg)
    const padding = 2
    const node = rc.path(
      roundedRectPath(padding, padding, width - padding * 2, resolvedHeight - padding * 2, 20),
      {
        fill: resolveColor(fillColor),
        fillStyle,
        stroke: resolveColor(strokeColor),
        strokeWidth,
        roughness,
        seed,
        bowing: 1,
      },
    )
    svg.appendChild(node)
  }, [width, resolvedHeight, fillColor, strokeColor, strokeWidth, roughness, seed, fillStyle, themeKey])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div
      ref={wrapperRef}
      className={`relative ${pulse ? 'animate-pulse-warning' : ''} ${className}`}
      style={{ width }}
    >
      {resolvedHeight > 0 && (
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={resolvedHeight}
          style={{ zIndex: 0 }}
        />
      )}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
