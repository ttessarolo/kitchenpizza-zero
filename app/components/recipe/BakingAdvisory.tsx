import { useState } from 'react'
import type { OvenConfig } from '@commons/types/recipe'
import { WarningCard } from '~/components/recipe-flow/WarningCard'
import { useRecipeFlowStore, selectGraph } from '~/stores/recipe-flow-store'

interface BakingAdvisoryProps {
  ovenCfg: OvenConfig
  recipeType: string
  recipeSubtype: string | null
  calculatedDur: number
  baseDur: number
  nodeId?: string
  method?: string
}

export function BakingAdvisory({
  nodeId,
}: BakingAdvisoryProps) {
  // Warnings are now computed server-side by the reconciler.
  // Filter the store's warnings for this specific node.
  const storeWarnings = useRecipeFlowStore((s) => s.warnings)
  const warnings = nodeId
    ? storeWarnings.filter((w) => w.sourceNodeId === nodeId)
    : []
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const graphNodes = useRecipeFlowStore((s) => selectGraph(s).nodes)
  const graphEdges = useRecipeFlowStore((s) => selectGraph(s).edges)

  // Check which advisory IDs already have downstream nodes tagged with advisorySourceId
  const appliedAdvisoryIds = new Set<string>()
  if (nodeId) {
    const downstreamIds = graphEdges.filter((e) => e.source === nodeId).map((e) => e.target)
    for (const dId of downstreamIds) {
      const dNode = graphNodes.find((n) => n.id === dId)
      if (dNode?.data.advisorySourceId) appliedAdvisoryIds.add(dNode.data.advisorySourceId)
    }
  }

  const visible = warnings.filter((w) => !dismissed.has(w.id))
  if (visible.length === 0) return null

  return (
    <div className="mt-2 space-y-1.5">
      {visible.map((w) => (
        <WarningCard
          key={w.id}
          warning={w}
          appliedAdvisoryIds={appliedAdvisoryIds}
          onDismiss={() => setDismissed((s) => new Set(s).add(w.id))}
        />
      ))}
    </div>
  )
}
