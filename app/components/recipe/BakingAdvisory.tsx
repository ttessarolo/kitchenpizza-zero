import { useState } from 'react'
import type { OvenConfig } from '@commons/types/recipe'
import { getBakingWarnings, type BakingWarning } from '@commons/utils/baking'

interface BakingAdvisoryProps {
  ovenCfg: OvenConfig
  recipeType: string
  recipeSubtype: string | null
  calculatedDur: number
  baseDur: number
}

export function BakingAdvisory({
  ovenCfg,
  recipeType,
  recipeSubtype,
  calculatedDur,
  baseDur,
}: BakingAdvisoryProps) {
  const warnings = getBakingWarnings(ovenCfg, recipeType, recipeSubtype, calculatedDur, baseDur)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = warnings.filter((w) => !dismissed.has(w.type))
  if (visible.length === 0) return null

  return (
    <div className="mt-2 space-y-1.5">
      {visible.map((w) => (
        <div
          key={w.type}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
            w.severity === 'warning'
              ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
              : 'border-stone-300 bg-stone-50 text-stone-700 dark:border-stone-600 dark:bg-stone-900/40 dark:text-stone-300'
          }`}
        >
          <span className="mt-0.5 shrink-0">
            {w.severity === 'warning' ? '⚠️' : '💡'}
          </span>
          <span className="flex-1">{w.message}</span>
          <button
            type="button"
            onClick={() => setDismissed((s) => new Set(s).add(w.type))}
            className="mt-0.5 shrink-0 text-[10px] opacity-50 hover:opacity-100"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
