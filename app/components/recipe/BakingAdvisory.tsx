import { useState } from 'react'
import type { OvenConfig } from '@commons/types/recipe'
import { getBakingWarnings } from '@commons/utils/baking'
import { WarningCard } from '~/components/recipe-flow/WarningCard'

interface BakingAdvisoryProps {
  ovenCfg: OvenConfig
  recipeType: string
  recipeSubtype: string | null
  calculatedDur: number
  baseDur: number
  nodeId?: string
}

export function BakingAdvisory({
  ovenCfg,
  recipeType,
  recipeSubtype,
  calculatedDur,
  baseDur,
  nodeId,
}: BakingAdvisoryProps) {
  const warnings = getBakingWarnings(ovenCfg, recipeType, recipeSubtype, calculatedDur, baseDur)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = warnings.filter((w) => !dismissed.has(w.id))
  if (visible.length === 0) return null

  return (
    <div className="mt-2 space-y-1.5">
      {visible.map((w) => (
        <WarningCard
          key={w.id}
          warning={{
            id: w.id,
            sourceNodeId: nodeId,
            category: w.category as any,
            severity: w.severity,
            message: w.message,
            actions: w.actions,
          }}
          onDismiss={() => setDismissed((s) => new Set(s).add(w.id))}
        />
      ))}
    </div>
  )
}
