import { baseProcedure } from '../middleware/auth'
import { reconcileInputSchema, reconcileOutputSchema } from '../schemas/graph'
import { reconcileGraph } from '../services/graph-reconciler.service'
import { reconcileGraphV2 } from '../services/graph-reconciler-v2.service'
import { getScienceProvider } from '../middleware/science'
import { getFlags } from '../lib/feature-flags'
import { verifyReconciliation } from '../services/llm/verify-reconciliation'
import { applyWarningActionPure } from '@commons/utils/graph-mutation-engine'
import { applyLlmPerimeter } from '../services/llm/apply-perimeter'
import { getActivePerimeter } from '../../../local_data/llm-perimeter'
import type { RecipeLayer } from '@commons/types/recipe-layers'
import { getDefaultMasterConfig } from '@commons/constants/layer-defaults'

const AUTO_PILOT_CONFIDENCE_THRESHOLD = 0.7

export const reconcile = baseProcedure
  .input(reconcileInputSchema)
  .output(reconcileOutputSchema)
  .handler(async ({ input }) => {
    const provider = await getScienceProvider()
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
    const shouldVerify = flags.LLM_ENABLED && llmVerify && result.warnings.length > 0
    if (shouldVerify) {
      try {
        // Build a pseudo-layer from the reconcile input for domain-aware LLM verification
        const layerType = (input.layerType ?? 'impasto') as any
        const pseudoLayer: RecipeLayer = {
          id: 'reconcile-layer',
          type: layerType,
          subtype: input.layerSubtype ?? '',
          variant: input.layerVariant ?? '',
          name: input.meta.name ?? '',
          color: '#888',
          icon: '',
          position: 0,
          visible: true,
          locked: false,
          masterConfig: layerType === 'impasto'
            ? { type: 'impasto', config: result.portioning }
            : getDefaultMasterConfig(layerType, input.layerSubtype),
          nodes: result.graph.nodes as any,
          edges: result.graph.edges as any,
          lanes: result.graph.lanes as any,
        }

        // Look up domain persona from science provider
        const domains = provider.getDomains()
        const domainInfo = domains.find(d => d.key === layerType) ?? null

        llmVerification = await verifyReconciliation(
          pseudoLayer,
          { ...input.meta, locale } as any,
          result.warnings,
          locale,
          domainInfo,
        )
      } catch {
        // LLM verification failed — continue with science-only warnings
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

    // Step 4: Apply perimeter constraints to LLM verdicts
    let llmInsights: Array<{ category: string; severity: 'info' | 'warning'; explanation: string }> = []
    if (llmVerification) {
      const perimeter = getActivePerimeter()
      const perimeterResult = applyLlmPerimeter(result.warnings, llmVerification, perimeter)
      result = { ...result, warnings: perimeterResult.warnings }
      llmInsights = perimeterResult.insights
    }

    return {
      ...result,
      llmInsights,
    }
  })
