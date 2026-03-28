/**
 * Graph Reconciliation Engine — the core of the recipe calculation system.
 *
 * Implements a spreadsheet-like DAG recalculation pattern:
 * 1. Topological sort of all nodes
 * 2. Per-node reconciliation in order (pre-ferment, dough, rise, bake)
 * 3. Portioning sync from graph totals
 * 4. Warning generation from scientific guardrails
 *
 * This is a PURE FUNCTION — no side effects, no DB, fully testable.
 * Called by the oRPC procedure AND directly by the client store.
 *
 * Scientific basis: Casucci, "La Pizza è un Arte", 2ª ed. 2020
 */

import type {
  RecipeGraph,
  RecipeNode,
  RecipeEdge,
  ActionableWarning,
} from '@commons/types/recipe-graph'
import type {
  RecipeMeta,
  Portioning,
  BlendedFlourProps,
} from '@commons/types/recipe'
import {
  recalcPreFermentIngredients,
  adjustDoughForPreFerment,
} from '@commons/utils/recipe'
import { calcRiseDuration } from '@commons/utils/rise-manager'
import {
  rnd,
  blendFlourProperties,
  getSaltPct,
  getSugarPct,
  getFatPct,
  maxRiseHoursForW,
} from '@commons/utils/dough-manager'
import {
  topologicalSortGraph,
  getNodeTotalWeight,
} from '@commons/utils/graph-utils'
import {
  nodeToStep,
  stepToNodeData,
} from '@commons/utils/graph-adapter'
import { getBakingProfile, calcBakeDuration } from '@commons/utils/baking'
import { calcDuration as calcBakeDurationV2, syncCookingFats, getWarnings as getBakeWarnings } from '@commons/utils/bake-manager'
import type { FryConfig, CookingConfig } from '@commons/types/recipe'
import { getDoughWarnings } from '@commons/utils/dough-manager'
import { toActionableWarnings } from '@commons/utils/science/rule-engine'
import { RISE_METHODS, YEAST_TYPES, FLOUR_CATALOG } from '../../../local_data'

import type { ScienceProvider } from '@commons/utils/science/science-provider'

// ── Result type ─────────────────────────────────────────────

export interface ReconcileResult {
  graph: RecipeGraph
  portioning: Portioning
  warnings: ActionableWarning[]
}

// maxRiseHoursForW → imported from dough-manager

// ── Helper: compute graph totals (pure, no React dependency) ────

interface GraphTotals {
  totalFlour: number
  totalLiquid: number
  totalDough: number
  currentHydration: number
}

const DOUGH_NODE_TYPES = new Set([
  'pre_dough', 'pre_ferment', 'dough', 'rest', 'rise', 'shape',
  'pre_bake', 'bake', 'done', 'split', 'join',
])

function computeTotals(graph: RecipeGraph): GraphTotals {
  let totalFlour = 0
  let totalLiquid = 0
  let totalDough = 0

  for (const n of graph.nodes) {
    if (!DOUGH_NODE_TYPES.has(n.type)) continue
    const d = n.data
    totalFlour += d.flours.reduce((a, f) => a + f.g, 0)
    totalLiquid += d.liquids.reduce((a, l) => a + l.g, 0)
    totalDough += getNodeTotalWeight(d)
  }

  const currentHydration = totalFlour > 0 ? Math.round((totalLiquid / totalFlour) * 100) : 0
  return { totalFlour, totalLiquid, totalDough, currentHydration }
}

// ── Helper: find upstream dough node for a rise/shape node ──────

function findUpstreamDough(
  nodeId: string,
  nodes: RecipeNode[],
  edges: RecipeEdge[],
): RecipeNode | null {
  const visited = new Set<string>()
  const queue = edges.filter((e) => e.target === nodeId).map((e) => e.source)

  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const node = nodes.find((n) => n.id === id)
    if (!node) continue
    if (node.type === 'dough' || node.type === 'pre_dough') return node
    // Keep searching upstream
    edges.filter((e) => e.target === id).forEach((e) => queue.push(e.source))
  }
  return null
}

// ── Helper: extract flour blend properties from a dough node ────

function getDoughFlourProps(doughNode: RecipeNode): BlendedFlourProps {
  if (doughNode.data.flours.length === 0) {
    // Default flour properties
    return {
      protein: 12, W: 280, PL: 0.55, absorption: 58,
      ash: 0.55, fiber: 2.2, starchDamage: 7,
      fermentSpeed: 1, fallingNumber: 340,
    }
  }
  return blendFlourProperties(doughNode.data.flours, [...FLOUR_CATALOG])
}

// ── Helper: get yeast percentage and speed factor ───────────

function getYeastInfo(doughNode: RecipeNode): { yPct: number; ySF: number } {
  const totalFlour = doughNode.data.flours.reduce((a, f) => a + f.g, 0)
  const totalYeast = (doughNode.data.yeasts ?? []).reduce((a, y) => a + y.g, 0)
  const yPct = totalFlour > 0 ? (totalYeast / totalFlour) * 100 : 0

  // Lookup yeast speed factor from first yeast type
  const yeastType = (doughNode.data.yeasts ?? [])[0]?.type
  const yt = YEAST_TYPES.find((y) => y.key === yeastType)
  const ySF = yt?.speedF ?? 1

  return { yPct, ySF }
}

// ═══════════════════════════════════════════════════════════════
// ██  MAIN RECONCILE FUNCTION
// ═══════════════════════════════════════════════════════════════

export function reconcileGraph(
  graph: RecipeGraph,
  portioning: Portioning,
  meta: RecipeMeta,
  provider?: ScienceProvider,
): ReconcileResult {
  if (graph.nodes.length === 0) {
    return { graph, portioning, warnings: [] }
  }

  const warnings: ActionableWarning[] = []
  let nodes = graph.nodes.map((n) => ({ ...n, data: { ...n.data } })) // deep-ish clone
  const edges = [...graph.edges]

  // ── Phase 1: Pre-ferment reconciliation ──────────────────────
  // Convert to v1 for existing utility functions
  const target = portioning.mode === 'tray'
    ? Math.round(portioning.tray.l * portioning.tray.w * portioning.thickness * portioning.tray.count)
    : portioning.ball.weight * portioning.ball.count

  for (const n of nodes) {
    if (n.type === 'pre_ferment' && n.data.preFermentCfg) {
      // Recalculate pre-ferment ingredients from config
      const step = nodeToStep(n, edges)
      const recalced = recalcPreFermentIngredients(step, target)
      const patch = stepToNodeData(recalced)
      Object.assign(n.data, patch)

      // Adjust linked dough step
      const v1Steps = nodes.map((nd) => nodeToStep(nd, edges))
      const adjusted = adjustDoughForPreFerment(v1Steps, n.id, target, portioning.targetHyd)
      for (const adj of adjusted) {
        const node = nodes.find((nd) => nd.id === adj.id)
        if (node && adj.id !== n.id) {
          Object.assign(node.data, stepToNodeData(adj))
        }
      }
    }
  }

  // ── Phase 2: Topological pass — dough analysis + rise recalc ─
  const sorted = topologicalSortGraph({ ...graph, nodes, edges })

  // Cache dough properties for downstream nodes
  const doughPropsCache = new Map<string, {
    bp: BlendedFlourProps
    yPct: number
    ySF: number
    saltPct: number
    sugarPct: number
    fatPct: number
  }>()

  for (const n of sorted) {
    const nodeRef = nodes.find((x) => x.id === n.id)!

    // ── Dough: extract flour properties ──
    if (nodeRef.type === 'dough') {
      const bp = getDoughFlourProps(nodeRef)
      const { yPct, ySF } = getYeastInfo(nodeRef)
      const totalFlour = nodeRef.data.flours.reduce((a, f) => a + f.g, 0)

      doughPropsCache.set(nodeRef.id, {
        bp,
        yPct,
        ySF,
        saltPct: totalFlour > 0 ? getSaltPct(nodeRef.data.salts ?? [], totalFlour) : 0,
        sugarPct: totalFlour > 0 ? getSugarPct(nodeRef.data.sugars ?? [], totalFlour) : 0,
        fatPct: totalFlour > 0 ? getFatPct(nodeRef.data.fats ?? [], totalFlour) : 0,
      })

      // Warning: flour W vs hours
      const maxH = provider ? maxRiseHoursForW(provider, bp.W) : Infinity
      // Check all downstream rise nodes
      for (const riseNode of nodes.filter((x) => x.type === 'rise')) {
        const upstream = findUpstreamDough(riseNode.id, nodes, edges)
        if (upstream?.id === nodeRef.id) {
          const riseHours = riseNode.data.baseDur / 60
          if (riseHours > maxH) {
            warnings.push({
              id: `flour_w_${nodeRef.id}_${riseNode.id}`,
              category: 'flour',
              severity: 'warning',
              messageKey: 'flour_w_max_rise',
              messageVars: {
                W: Math.round(bp.W),
                maxH,
                riseTitle: riseNode.data.title,
                riseHours: rnd(riseHours),
              },
            })
          }
        }
      }
    }

    // ── Rise: recalculate duration if not user-overridden ──
    if (nodeRef.type === 'rise' && !nodeRef.data.userOverrideDuration) {
      const upstreamDough = findUpstreamDough(nodeRef.id, nodes, edges)
      if (upstreamDough) {
        const props = doughPropsCache.get(upstreamDough.id)
        if (props && props.yPct > 0) {
          const rm = nodeRef.data.riseMethod || 'room'
          const rmEntry = RISE_METHODS.find((m) => m.key === rm)
          const tf = rmEntry?.tf ?? 1

          const newDur = provider ? calcRiseDuration(
            provider,
            {
              base: 60,
              method_key: rm,
              W: props.bp.W,
              yeastPct: props.yPct,
              yeastSpeedFactor: props.ySF,
              temperatureFactor: tf,
              starchDamage: props.bp.starchDamage,
              fallingNumber: props.bp.fallingNumber,
              fiber: props.bp.fiber,
              saltPct: props.saltPct,
              sugarPct: props.sugarPct,
              fatPct: props.fatPct,
            },
          ) : nodeRef.data.baseDur

          nodeRef.data.baseDur = Math.max(15, newDur) // min 15 minutes
        }
      }
    }

    // ── Bake: recalculate duration if not user-overridden ──
    if (nodeRef.type === 'bake' && !nodeRef.data.userOverrideDuration) {
      if (nodeRef.data.cookingCfg) {
        // New path: use BakeManager for all cooking methods
        nodeRef.data.baseDur = calcBakeDurationV2(
          nodeRef.subtype ?? 'forno',
          nodeRef.data.cookingCfg,
          meta.type,
          meta.subtype,
          portioning.thickness,
        )
      } else if (nodeRef.data.ovenCfg) {
        // Legacy path: backward compat for nodes without cookingCfg
        const profile = getBakingProfile(meta.type, meta.subtype)
        if (profile) {
          nodeRef.data.baseDur = calcBakeDuration(profile, nodeRef.data.ovenCfg, portioning.thickness)
        }
      }
    }

    // ── Bake: auto-sync cooking fats ──
    if (nodeRef.type === 'bake') {
      const method = nodeRef.data.cookingCfg?.method
      const OIL_METHODS = ['frittura', 'aria', 'padella']
      if (method === 'frittura') {
        nodeRef.data.cookingFats = syncCookingFats(nodeRef.data.cookingFats ?? [], nodeRef.data.cookingCfg!.cfg as FryConfig)
      } else if (!OIL_METHODS.includes(method ?? '')) {
        // Clear cooking fats for methods that don't use oil (forno, pentola, vapore, griglia)
        nodeRef.data.cookingFats = []
      }
    }

    // ── Bake: generate per-node warnings via Science rules ──
    if (provider && nodeRef.type === 'bake') {
      // Resolve cooking config: prefer cookingCfg, fallback to ovenCfg (legacy)
      const cc = nodeRef.data.cookingCfg ?? (nodeRef.data.ovenCfg ? {
        method: nodeRef.subtype ?? 'forno',
        cfg: nodeRef.data.ovenCfg,
      } as CookingConfig : null)

      if (cc) {
        const bakeRuleResults = getBakeWarnings(
          provider,
          cc,
          meta.type,
          meta.subtype,
          nodeRef.data.baseDur,
          nodeRef.data,
        )
        warnings.push(...toActionableWarnings(bakeRuleResults, nodeRef.id))
      }
    }

    // ── Bake/pre_bake/post_bake: ALWAYS assign "Cottura [dough title]" group ──
    if (nodeRef.type === 'bake' || nodeRef.type === 'pre_bake' || nodeRef.type === 'post_bake') {
      const upstreamDough = findUpstreamDough(nodeRef.id, nodes, edges)
      const autoGroupName = 'Cottura' + (upstreamDough ? ` ${upstreamDough.data.title}` : '')
      nodeRef.data.group = autoGroupName
    }

    // ── Split: validate sum ──
    if (nodeRef.type === 'split' && nodeRef.data.splitOutputs && nodeRef.data.splitMode === 'pct') {
      const sum = nodeRef.data.splitOutputs.reduce((a, o) => a + o.value, 0)
      if (Math.abs(sum - 100) > 0.01) {
        warnings.push({
          id: `split_sum_${nodeRef.id}`,
          category: 'general',
          severity: 'warning',
          messageKey: 'split_sum_not_100',
          messageVars: {
            title: nodeRef.data.title,
            sum: Math.round(sum),
          },
        })
      }
    }
  }

  // Phase 3 REMOVED: portioning is the user's source of truth.
  // The reconciler does NOT overwrite portioning.thickness or ball.weight.
  // Only explicit user actions (scaleAllNodes, handlePortioningChangeWithScale) change portioning.
  const totals = computeTotals({ ...graph, nodes, edges })
  const newPortioning = { ...portioning }

  // ── Phase 4: Generate composition warnings ───────────────────
  const doughRuleResults = provider ? getDoughWarnings(provider, {
    doughHours: portioning.doughHours,
    yeastPct: portioning.yeastPct,
    saltPct: portioning.saltPct,
    fatPct: portioning.fatPct,
    hydration: totals.currentHydration || portioning.targetHyd,
    recipeType: meta.type,
    recipeSubtype: meta.subtype,
  }) : []
  warnings.push(...toActionableWarnings(doughRuleResults))

  // Autolisi + pre-ferment + high hydration warning
  const hasAutolisi = nodes.some((n) => n.type === 'pre_dough' && n.subtype === 'autolisi')
  const hasPreFerment = nodes.some((n) => n.type === 'pre_ferment')
  const effectiveHyd = totals.currentHydration || portioning.targetHyd
  if (hasAutolisi && hasPreFerment && effectiveHyd > 78) {
    warnings.push({
      id: 'autolisi_preferment_hyd',
      category: 'hydration',
      severity: 'warning',
      messageKey: 'autolisi_preferment_hyd',
      messageVars: { hydration: effectiveHyd },
    })
  }

  return {
    graph: { ...graph, nodes, edges },
    portioning: newPortioning,
    warnings,
  }
}
