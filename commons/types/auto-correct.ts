/**
 * Types for the RecipeAutoCorrectManager — iterative constraint solver.
 */

import type { RecipeGraph, ActionableWarning } from './recipe-graph'
import type { Portioning } from './recipe'

/** Configuration for auto-correction behavior */
export interface AutoCorrectConfig {
  /** true = apply fixes automatically; false = analyze only (suggest ordered actions) */
  autoCorrect: boolean
  /** Controls max iterations: low=3, medium=5, high=8 */
  reasoningLevel: 'low' | 'medium' | 'high'
}

/** A single step in the auto-correction process */
export interface AutoCorrectStep {
  round: number
  warningId: string
  messageKey: string
  messageVars?: Record<string, unknown>
  actionLabelKey: string
  outcome: 'applied' | 'skipped'
  reason?: string
  warningsBefore: number
  warningsAfter: number
}

/** The structured report from auto-correction */
export interface AutoCorrectReport {
  status: 'ok' | 'ko'
  steps: AutoCorrectStep[]
  warningsResolved: number
  warningsRemaining: ActionableWarning[]
  roundsUsed: number
  maxRounds: number
}

/** Complete result: updated graph + portioning + report */
export interface AutoCorrectResult {
  graph: RecipeGraph
  portioning: Portioning
  report: AutoCorrectReport
}
