import { useRef, useEffect, useState, useCallback } from 'react'
import { Handle, type HandleProps } from '@xyflow/react'
import rough from 'roughjs'

interface SketchyHandleProps extends HandleProps {
  /** CSS var name for stroke, e.g. 'step-dough-tx' */
  strokeColorVar: string
  seed?: number
}

function resolveColor(varName: string): string {
  if (typeof document === 'undefined') return 'transparent'
  const hsl = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`).trim()
  return hsl ? `hsl(${hsl})` : 'transparent'
}

export function SketchyHandle({
  strokeColorVar,
  seed = 42,
  ...handleProps
}: SketchyHandleProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [themeKey, setThemeKey] = useState(0)

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

  const draw = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild)
    }

    const rc = rough.svg(svg)
    const size = 14 // match the handle size
    const r = size / 2
    const node = rc.circle(r, r, size, {
      fill: resolveColor('card'),
      fillStyle: 'solid',
      stroke: resolveColor(strokeColorVar),
      strokeWidth: 2,
      roughness: 1.0,
      seed,
    })
    svg.appendChild(node)
  }, [strokeColorVar, seed, themeKey])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className="relative">
      <Handle
        {...handleProps}
        className="!w-3.5 !h-3.5 !border-0 !bg-transparent"
      />
      <svg
        ref={svgRef}
        width={14}
        height={14}
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }}
      />
    </div>
  )
}
