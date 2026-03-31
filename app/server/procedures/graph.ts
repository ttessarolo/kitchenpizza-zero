import { resolve } from 'path'
import { baseProcedure } from '../middleware/auth'
import { reconcileInputSchema, reconcileOutputSchema } from '../schemas/graph'
import { reconcileGraph } from '../services/graph-reconciler.service'
import { reconcileGraphV2 } from '../services/graph-reconciler-v2.service'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { getFlags } from '../lib/feature-flags'
import { verifyReconciliation } from '../services/llm/verify-reconciliation'
import { applyWarningActionPure } from '@commons/utils/graph-mutation-engine'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

const AUTO_PILOT_CONFIDENCE_THRESHOLD = 0.7

export const reconcile = baseProcedure
  .input(reconcileInputSchema)
  .output(reconcileOutputSchema)
  .handler(async ({ input }) => {
    const flags = getFlags()
    const reconcileFn = flags.USE_V2_RECONCILER ? reconcileGraphV2 : reconcileGraph
    const locale = input.locale ?? 'it'
    const llmVerify = input.llmVerify !== false
    const autoResolve = input.autoResolve === true

    // Step 1: Brain 1+2 deterministic reconciliation
    let result = reconcileFn(
      input.graph as any,
      input.portioning as any,
      { ...input.meta, locale },
      provider,
    )

    // Step 2: Brain 3 LLM verification (optional)
    let llmVerification = null
    if (flags.LLM_ENABLED && llmVerify && result.warnings.length > 0) {
      try {
        llmVerification = await verifyReconciliation(
          result.graph,
          result.portioning,
          { ...input.meta, locale } as any,
          result.warnings,
          locale,
        )
      } catch (e) {
        // LLM failure is non-blocking — log and continue
        console.warn('[Brain 3] LLM verification failed:', (e as Error).message)
      }
    }

    // Step 3: Auto Pilot — apply high-confidence actions
    if (autoResolve && llmVerification?.autoActions?.length) {
      let currentGraph = result.graph
      let currentPortioning = result.portioning
      let applied = false

      for (const action of llmVerification.autoActions) {
        if (action.confidence < AUTO_PILOT_CONFIDENCE_THRESHOLD) continue
        const warning = result.warnings.find(w => w.id === action.warningId)
        if (!warning?.actions?.[action.actionIndex]) continue

        // applyWarningActionPure(warning, actionIdx, graph, portioning)
        const applyResult = applyWarningActionPure(
          warning,
          action.actionIndex,
          currentGraph,
          currentPortioning,
        )
        if (applyResult) {
          currentGraph = applyResult.graph
          currentPortioning = applyResult.portioning
          applied = true
        }
      }

      // Re-reconcile to validate science-proof state
      if (applied) {
        result = reconcileFn(
          currentGraph as any,
          currentPortioning as any,
          { ...input.meta, locale },
          provider,
        )
      }
    }

    return {
      ...result,
      ...(llmVerification ? { llmVerification } : {}),
    }
  })
