/**
 * recipe-rpc.ts — Client-side oRPC wrappers with debouncing.
 *
 * ALL scientific and catalog computations go through these functions.
 * The client NEVER imports from @commons/utils/*-manager.
 */
import type { RecipeGraph } from '@commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '@commons/types/recipe'
import type { RecipeLayer, CrossLayerEdge } from '@commons/types/recipe-layers'

// ── Internal: direct oRPC client (not React Query hooks) ─────
// We need the raw client for imperative calls from the store.

async function getClient() {
  if (typeof window === 'undefined') {
    // Server-side: import router directly
    const { appRouter } = await import('~/server/router')
    const { createRouterClient } = await import('@orpc/server')
    return createRouterClient(appRouter, { context: async () => ({}) })
  } else {
    // Client-side: use fetch link
    const { createORPCClient } = await import('@orpc/client')
    const { RPCLink } = await import('@orpc/client/fetch')
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
    return createORPCClient<any>(new RPCLink({ url: `${baseUrl}/api/rpc` }))
  }
}

let clientPromise: Promise<any> | null = null
function ensureClient(): Promise<any> {
  if (!clientPromise) clientPromise = getClient()
  return clientPromise
}

// ── Debounced reconcile ─────────────────────────────────────

let reconcileController: AbortController | null = null
let reconcileTimer: ReturnType<typeof setTimeout> | null = null

export interface ReconcileResult {
  graph: RecipeGraph
  portioning: Portioning
  warnings: any[]
  llmVerification?: any
}

export async function reconcileGraphRPC(
  graph: RecipeGraph,
  portioning: Portioning,
  meta: RecipeMeta,
  locale: string,
  opts?: { debounceMs?: number; llmVerify?: boolean; autoResolve?: boolean },
): Promise<ReconcileResult> {
  reconcileController?.abort()
  if (reconcileTimer) clearTimeout(reconcileTimer)

  return new Promise((resolve, reject) => {
    reconcileTimer = setTimeout(async () => {
      reconcileController = new AbortController()
      try {
        const client = await ensureClient()
        const result = await client.graph.reconcile({
          graph, portioning, meta, locale,
          llmVerify: opts?.llmVerify ?? true,
          autoResolve: opts?.autoResolve ?? false,
        })
        resolve(result as ReconcileResult)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') reject(e)
      }
    }, opts?.debounceMs ?? 300)
  })
}

// ── Auto-correct ────────────────────────────────────────────

export async function autoCorrectRPC(
  graph: RecipeGraph,
  portioning: Portioning,
  meta: RecipeMeta,
  locale: string,
  options: { autoCorrect: boolean; reasoningLevel: 'low' | 'medium' | 'high' },
): Promise<{ graph: RecipeGraph; portioning: Portioning; warnings: any[]; report: any }> {
  const client = await ensureClient()
  return client.graph.autoCorrect({ graph, portioning, meta, locale, options })
}

// ── Dough calculations ──────────────────────────────────────

export async function calcYeastPctRPC(
  hours: number, hydration: number, tempC: number,
): Promise<number> {
  const client = await ensureClient()
  const result = await client.dough.calcYeast({ hours, hydration, tempC })
  return result.yeastPct
}

export async function calcDurationFromYeastRPC(
  yeastPct: number, hydration: number, tempC: number,
): Promise<number> {
  const client = await ensureClient()
  const result = await client.dough.calcDuration({ yeastPct, hydration, tempC })
  return result.hours
}

export async function calcFinalDoughTempRPC(
  flours: any[], liquids: any[], ambientTemp: number, frictionFactor: number,
): Promise<number> {
  const client = await ensureClient()
  const result = await client.dough.calcTemp({ flours, liquids, ambientTemp, frictionFactor })
  return result.finalTemp
}

export async function getDoughDefaultsRPC(
  recipeType: string, recipeSubtype: string | null,
) {
  const client = await ensureClient()
  return client.dough.getDefaults({ recipeType, recipeSubtype })
}

export async function getCompositionPctsRPC(
  salts: any[], sugars: any[], fats: any[], totalFlour: number,
): Promise<{ saltPct: number; sugarPct: number; fatPct: number }> {
  const client = await ensureClient()
  return client.dough.getCompositionPcts({ salts, sugars, fats, totalFlour })
}

// ── Flour calculations ──────────────────────────────────────

export async function getFlourRPC(key: string) {
  const client = await ensureClient()
  return client.flour.getById({ key })
}

export async function blendFlourPropertiesRPC(flours: any[]) {
  const client = await ensureClient()
  return client.flour.blendProperties({ flours })
}

export async function estimateBlendWRPC(flourKeys: string[]): Promise<number> {
  const client = await ensureClient()
  const result = await client.flour.estimateBlendW({ flourKeys })
  return result.W
}

export async function estimateWFromProteinRPC(protein: number): Promise<number> {
  const client = await ensureClient()
  const result = await client.flour.estimateW({ protein })
  return result.W
}

// ── Bake calculations ───────────────────────────────────────

export async function getDefaultBakeConfigRPC(subtype: string) {
  const client = await ensureClient()
  return client.bake.getDefaultConfig({ subtype })
}

// ── Panoramica ──────────────────────────────────────────────

export async function computePanoramicaRPC(
  layers: RecipeLayer[], meta: RecipeMeta, crossEdges?: CrossLayerEdge[],
) {
  const client = await ensureClient()
  return client.panoramica.compute({ layers, meta, crossEdges: crossEdges ?? [] })
}
