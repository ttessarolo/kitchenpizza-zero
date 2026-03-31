import type { ActionableWarning } from '@commons/types/recipe-graph'
import type { LlmVerificationResult } from '../../schemas/llm-verification'
import type { LlmPerimeter } from '../../../../local_data/llm-perimeter'

const SEVERITY_RANK: Record<string, number> = { info: 0, warning: 1, error: 2 }
const RANK_TO_SEVERITY: Record<number, 'info' | 'warning' | 'error'> = { 0: 'info', 1: 'warning', 2: 'error' }

interface PerimeterResult {
  warnings: ActionableWarning[]
  insights: Array<{ category: string; severity: 'info' | 'warning'; explanation: string }>
  conflicts: Array<{ warningId: string; llmVerdict: string; reason: string }>
}

export function applyLlmPerimeter(
  warnings: ActionableWarning[],
  verification: LlmVerificationResult | null,
  perimeter: LlmPerimeter,
): PerimeterResult {
  const conflicts: PerimeterResult['conflicts'] = []

  if (!verification) {
    return { warnings, insights: [], conflicts }
  }

  // Apply verdicts to warnings within perimeter bounds
  const modifiedWarnings = warnings.map(w => {
    // Find matching verdict by messageKey or id
    const verdict = verification.verifiedWarnings.find(
      v => v.warningId === w.messageKey || v.warningId === w.id
    )
    if (!verdict) return w

    const copy = { ...w } as ActionableWarning & { _llmVerdict?: string; _llmReason?: string }
    const currentRank = SEVERITY_RANK[w.severity] ?? 1

    switch (verdict.llmVerdict) {
      case 'confirmed':
        copy._llmVerdict = 'confirmed'
        copy._llmReason = verdict.llmReason
        break

      case 'dismissed': {
        if (!perimeter.canDismiss) {
          conflicts.push({ warningId: w.id, llmVerdict: 'dismissed', reason: `Perimeter: canDismiss=false` })
          copy._llmVerdict = 'confirmed' // fallback to confirmed
          copy._llmReason = verdict.llmReason
          break
        }
        const dismissRank = SEVERITY_RANK[perimeter.dismissMaxSeverity] ?? 0
        if (currentRank > dismissRank) {
          conflicts.push({ warningId: w.id, llmVerdict: 'dismissed', reason: `Perimeter: severity ${w.severity} > dismissMaxSeverity ${perimeter.dismissMaxSeverity}` })
          copy._llmVerdict = 'confirmed'
          copy._llmReason = verdict.llmReason
          break
        }
        copy._llmVerdict = 'dismissed'
        copy._llmReason = verdict.llmReason
        break
      }

      case 'downgraded': {
        if (!perimeter.canDowngrade || perimeter.maxDowngradeSteps === 0) {
          conflicts.push({ warningId: w.id, llmVerdict: 'downgraded', reason: `Perimeter: canDowngrade=false` })
          copy._llmVerdict = 'confirmed'
          copy._llmReason = verdict.llmReason
          break
        }
        const newRank = Math.max(0, currentRank - perimeter.maxDowngradeSteps)
        if (newRank < currentRank) {
          copy.severity = RANK_TO_SEVERITY[newRank] ?? 'info'
          copy._llmVerdict = 'downgraded'
          copy._llmReason = verdict.llmReason
        } else {
          copy._llmVerdict = 'confirmed'
          copy._llmReason = verdict.llmReason
        }
        break
      }

      case 'upgraded': {
        if (!perimeter.canUpgrade || perimeter.maxUpgradeSteps === 0) {
          conflicts.push({ warningId: w.id, llmVerdict: 'upgraded', reason: `Perimeter: canUpgrade=false` })
          copy._llmVerdict = 'confirmed'
          copy._llmReason = verdict.llmReason
          break
        }
        const newRank = Math.min(2, currentRank + perimeter.maxUpgradeSteps)
        if (newRank > currentRank) {
          copy.severity = RANK_TO_SEVERITY[newRank] ?? 'warning'
          copy._llmVerdict = 'upgraded'
          copy._llmReason = verdict.llmReason
        } else {
          copy._llmVerdict = 'confirmed'
          copy._llmReason = verdict.llmReason
        }
        break
      }
    }

    return copy
  })

  // Filter out dismissed warnings
  const finalWarnings = modifiedWarnings.filter(w => (w as any)._llmVerdict !== 'dismissed')

  // Filter insights
  const insights = perimeter.canGenerateInsights
    ? (verification.additionalInsights ?? [])
    : []

  // Log conflicts server-side
  if (perimeter.logScienceConflicts && conflicts.length > 0) {
    console.warn('[Brain 3 CONFLICT]', JSON.stringify(conflicts))
  }

  return { warnings: finalWarnings, insights, conflicts }
}
