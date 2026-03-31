/**
 * Graph Reconciliation Engine V2 — Graphology-based.
 *
 * Identical behavior to V1 but uses RecipeGraphEngine for all
 * graph traversals. Same pure function signature.
 *
 * V1 replacements:
 * - topologicalSortGraph() → engine.topologicalSort()
 * - findUpstreamDough()    → engine.findUpstream(id, 'dough')
 * - nodes.find(n => ...)   → engine.getNode(id) / engine.getNodeData(id)
 * - nodes.filter(n => ...) → engine.findNodes({ type: ... })
 */

import type {
  RecipeGraph,
  RecipeNode,
  ActionableWarning,
} from '@commons/types/recipe-graph'
import type {
  RecipeMeta,
  Portioning,
  BlendedFlourProps,
  FryConfig,
  CookingConfig,
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
  getDoughWarnings,
} from '@commons/utils/dough-manager'
import { getFlour, isGlutenFree, isWholeGrain } from '@commons/utils/flour-manager'
import { getNodeTotalWeight } from '@commons/utils/graph-utils'
import { nodeToStep, stepToNodeData } from '@commons/utils/graph-adapter'
import { getBakingProfile, calcBakeDuration } from '@commons/utils/baking'
import { calcDuration as calcBakeDurationV2, syncCookingFats, getWarnings as getBakeWarnings } from '@commons/utils/bake-manager'
import { toActionableWarnings } from '@commons/utils/science/rule-engine'
import { RISE_METHODS, YEAST_TYPES, FLOUR_CATALOG } from '../../../local_data'
import { validateFermentationCoherence } from '@commons/utils/fermentation-coherence-manager'
import type { ScienceProvider } from '@commons/utils/science/science-provider'
import { DEFAULT_LOCKS } from '@commons/types/recipe'
import { isLockedMutation } from '@commons/utils/graph-mutation-engine'
import { scaleNodeData } from '@commons/utils/portioning-manager'

import { RecipeGraphEngine } from '../engines/recipe-graph-engine'
import type { ReconcileResult } from './graph-reconciler.service'

// ── Constants ──────────────────────────────────────────────
const DOUGH_NODE_TYPES = new Set([
  'pre_dough', 'pre_ferment', 'dough', 'rest', 'rise', 'shape',
  'pre_bake', 'bake', 'done', 'split', 'join',
])

// ── Helpers ────────────────────────────────────────────────

function getDoughFlourProps(data: RecipeNode['data']): BlendedFlourProps {
  if (data.flours.length === 0) {
    return {
      protein: 12, W: 280, PL: 0.55, absorption: 58,
      ash: 0.55, fiber: 2.2, starchDamage: 7,
      fermentSpeed: 1, fallingNumber: 340,
    }
  }
  return blendFlourProperties(data.flours, [...FLOUR_CATALOG])
}

function getYeastInfo(data: RecipeNode['data']): { yPct: number; ySF: number } {
  const totalFlour = data.flours.reduce((a, f) => a + f.g, 0)
  const totalYeast = (data.yeasts ?? []).reduce((a, y) => a + y.g, 0)
  const yPct = totalFlour > 0 ? (totalYeast / totalFlour) * 100 : 0

  const yeastType = (data.yeasts ?? [])[0]?.type
  const yt = YEAST_TYPES.find((y) => y.key === yeastType)
  const ySF = yt?.speedF ?? 1

  return { yPct, ySF }
}

function computeTotals(nodes: RecipeNode[]): { totalFlour: number; totalLiquid: number; totalDough: number; currentHydration: number } {
  let totalFlour = 0
  let totalLiquid = 0
  let totalDough = 0

  for (const n of nodes) {
    if (!DOUGH_NODE_TYPES.has(n.type)) continue
    totalFlour += n.data.flours.reduce((a, f) => a + f.g, 0)
    totalLiquid += n.data.liquids.reduce((a, l) => a + l.g, 0)
    totalDough += getNodeTotalWeight(n.data)
  }

  const currentHydration = totalFlour > 0 ? Math.round((totalLiquid / totalFlour) * 100) : 0
  return { totalFlour, totalLiquid, totalDough, currentHydration }
}

// ═══════════════════════════════════════════════════════════
// ██  MAIN RECONCILE FUNCTION V2
// ═══════════════════════════════════════════════════════════

export function reconcileGraphV2(
  graph: RecipeGraph,
  portioning: Portioning,
  meta: RecipeMeta,
  provider?: ScienceProvider,
): ReconcileResult {
  if (graph.nodes.length === 0) {
    return { graph, portioning, warnings: [] }
  }

  const warnings: ActionableWarning[] = []

  // Deep-ish clone nodes/edges for mutation
  let nodes = graph.nodes.map((n) => ({ ...n, data: { ...n.data } }))
  const edges = [...graph.edges]

  // Build graph engine
  const engine = new RecipeGraphEngine()
  engine.loadFromRecipeGraph({ ...graph, nodes, edges })

  const locks = portioning.locks ?? DEFAULT_LOCKS
  const target = portioning.mode === 'tray'
    ? Math.round(portioning.tray.l * portioning.tray.w * portioning.thickness * portioning.tray.count)
    : portioning.ball.weight * portioning.ball.count

  // ── Phase 1: Pre-ferment reconciliation ──────────────────────
  const preFermentIds = engine.findNodes({ type: 'pre_ferment' })
  for (const pfId of preFermentIds) {
    const pfNode = nodes.find(n => n.id === pfId)!
    if (pfNode.data.preFermentCfg && !locks.totalDough) {
      const step = nodeToStep(pfNode, edges)
      const recalced = recalcPreFermentIngredients(step, target)
      const patch = stepToNodeData(recalced)
      Object.assign(pfNode.data, patch)

      const v1Steps = nodes.map((nd) => nodeToStep(nd, edges))
      const adjusted = adjustDoughForPreFerment(v1Steps, pfNode.id, target, portioning.targetHyd)
      for (const adj of adjusted) {
        const node = nodes.find((nd) => nd.id === adj.id)
        if (node && adj.id !== pfNode.id) {
          Object.assign(node.data, stepToNodeData(adj))
        }
      }
    }
  }

  // Reload engine after phase 1 mutations
  engine.loadFromRecipeGraph({ ...graph, nodes, edges })

  // ── Phase 2: Topological pass — dough analysis + rise recalc ─
  const sorted = engine.topologicalSort()

  const doughPropsCache = new Map<string, {
    bp: BlendedFlourProps
    yPct: number
    ySF: number
    saltPct: number
    sugarPct: number
    fatPct: number
  }>()

  for (const nodeId of sorted) {
    const nodeRef = nodes.find((x) => x.id === nodeId)!

    // ── Dough: extract flour properties ──
    if (nodeRef.type === 'dough') {
      const bp = getDoughFlourProps(nodeRef.data)
      const { yPct, ySF } = getYeastInfo(nodeRef.data)
      const totalFlour = nodeRef.data.flours.reduce((a, f) => a + f.g, 0)

      doughPropsCache.set(nodeRef.id, {
        bp, yPct, ySF,
        saltPct: totalFlour > 0 ? getSaltPct(nodeRef.data.salts ?? [], totalFlour) : 0,
        sugarPct: totalFlour > 0 ? getSugarPct(nodeRef.data.sugars ?? [], totalFlour) : 0,
        fatPct: totalFlour > 0 ? getFatPct(nodeRef.data.fats ?? [], totalFlour) : 0,
      })

      // Warning: flour W vs hours
      const maxH = provider ? maxRiseHoursForW(provider, bp.W) : Infinity
      const riseIds = engine.findNodes({ type: 'rise' })
      for (const riseId of riseIds) {
        const upstreamDoughId = engine.findUpstream(riseId, 'dough')
        if (upstreamDoughId === nodeRef.id) {
          const riseNode = nodes.find(n => n.id === riseId)!
          const riseHours = riseNode.data.baseDur / 60
          if (riseHours > maxH) {
            warnings.push({
              id: `flour_w_${nodeRef.id}_${riseId}`,
              sourceNodeId: riseId,
              category: 'flour',
              severity: 'warning',
              messageKey: 'flour_w_max_rise',
              messageVars: {
                W: Math.round(bp.W), maxH,
                riseTitle: riseNode.data.title,
                riseHours: rnd(riseHours),
              },
              _ctx: { _maxBaseDur: Math.round(maxH * 60) },
              actions: [{
                labelKey: 'action.reduce_rise_to_max',
                mutations: [{ type: 'updateNode', target: { ref: 'self' }, patch: { baseDur: '_maxBaseDur', userOverrideDuration: true } }],
              }],
            })
          }
        }
      }
    }

    // ── Rise: recalculate duration ──
    if (nodeRef.type === 'rise' && !nodeRef.data.userOverrideDuration && !locks.duration) {
      const upstreamDoughId = engine.findUpstream(nodeRef.id, 'dough')
      if (upstreamDoughId) {
        const props = doughPropsCache.get(upstreamDoughId)
        if (props && props.yPct > 0) {
          const rm = nodeRef.data.riseMethod || 'room'
          const rmEntry = RISE_METHODS.find((m) => m.key === rm)
          const tf = rmEntry?.tf ?? 1

          const newDur = provider ? calcRiseDuration(provider, {
            base: 60, method_key: rm, W: props.bp.W,
            yeastPct: props.yPct, yeastSpeedFactor: props.ySF,
            temperatureFactor: tf, starchDamage: props.bp.starchDamage,
            fallingNumber: props.bp.fallingNumber, fiber: props.bp.fiber,
            saltPct: props.saltPct, sugarPct: props.sugarPct, fatPct: props.fatPct,
          }) : nodeRef.data.baseDur

          nodeRef.data.baseDur = Math.max(15, newDur)
        }
      }
    }

    // ── Bake: recalculate duration ──
    if (nodeRef.type === 'bake' && !nodeRef.data.userOverrideDuration) {
      if (nodeRef.data.cookingCfg) {
        nodeRef.data.baseDur = calcBakeDurationV2(
          nodeRef.subtype ?? 'forno',
          nodeRef.data.cookingCfg,
          meta.type, meta.subtype, portioning.thickness,
        )
      } else if (nodeRef.data.ovenCfg) {
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
        nodeRef.data.cookingFats = []
      }
    }

    // ── Bake: generate warnings via Science rules ──
    if (provider && nodeRef.type === 'bake') {
      const cc = nodeRef.data.cookingCfg ?? (nodeRef.data.ovenCfg ? {
        method: nodeRef.subtype ?? 'forno',
        cfg: nodeRef.data.ovenCfg,
      } as CookingConfig : null)

      if (cc) {
        const bakeRuleResults = getBakeWarnings(
          provider, cc, meta.type, meta.subtype, nodeRef.data.baseDur, nodeRef.data,
        )
        warnings.push(...toActionableWarnings(bakeRuleResults, nodeRef.id))
      }
    }

    // ── Bake/pre_bake/post_bake: auto-assign group ──
    if (nodeRef.type === 'bake' || nodeRef.type === 'pre_bake' || nodeRef.type === 'post_bake') {
      const upstreamDoughId = engine.findUpstream(nodeRef.id, 'dough')
      const upstreamDough = upstreamDoughId ? nodes.find(n => n.id === upstreamDoughId) : null
      const autoGroupName = 'Cottura' + (upstreamDough ? ` ${upstreamDough.data.title}` : '')
      nodeRef.data.group = autoGroupName
    }

    // ── Split: validate sum ──
    if (nodeRef.type === 'split' && nodeRef.data.splitOutputs && nodeRef.data.splitMode === 'pct') {
      const sum = nodeRef.data.splitOutputs.reduce((a, o) => a + o.value, 0)
      if (Math.abs(sum - 100) > 0.01) {
        warnings.push({
          id: `split_sum_${nodeRef.id}`,
          sourceNodeId: nodeRef.id,
          category: 'general',
          severity: 'warning',
          messageKey: 'split_sum_not_100',
          messageVars: { title: nodeRef.data.title, sum: Math.round(sum) },
        })
      }
    }
  }

  // ── Phase 2.5: Cross-node fermentation coherence ──────────────
  if (provider) {
    const risePhases = nodes.filter((n) => n.type === 'rise').map((n) => {
      const rm = n.data.riseMethod || 'room'
      const rmEntry = RISE_METHODS.find((m) => m.key === rm)
      return {
        nodeId: n.id, title: n.data.title, riseMethod: rm,
        baseDur: n.data.baseDur, tf: rmEntry?.tf ?? 1,
        userOverride: !!n.data.userOverrideDuration,
      }
    })

    if (risePhases.length > 0) {
      const mainDough = nodes.find((n) => n.type === 'dough')
      const doughProps = mainDough ? doughPropsCache.get(mainDough.id) : null
      const flourW = doughProps?.bp.W ?? 280

      // Use engine topological sort for nodeSequence
      const nodeSequence = sorted.map((id) => {
        const n = nodes.find(x => x.id === id)!
        return { nodeId: n.id, type: n.type, riseMethod: n.data.riseMethod ?? undefined }
      })

      const coherenceResults = validateFermentationCoherence(
        provider, risePhases,
        { flourW, yeastPct: doughProps?.yPct ?? 0 },
        { doughHours: portioning.doughHours, yeastPct: portioning.yeastPct },
        { nodeSequence },
      )

      const NODE_LEVEL_RULES = new Set(['rise_phases_insufficient', 'equivalent_time_exceeds_w_capacity', 'cold_rise_too_long'])
      for (const r of coherenceResults) {
        if (NODE_LEVEL_RULES.has(r.id)) {
          warnings.push(...toActionableWarnings([r]))
          for (const p of risePhases) {
            const [aw] = toActionableWarnings([r], p.nodeId)
            warnings.push({ ...aw, id: `${aw.id}_${p.nodeId}`, actions: undefined })
          }
        } else if (r.id === 'acclimatization_missing' && r.messageVars?.fridgeNodeId) {
          warnings.push(...toActionableWarnings([r], r.messageVars.fridgeNodeId as string))
        } else {
          warnings.push(...toActionableWarnings([r]))
        }
      }
    }
  }

  // ── Phase 3: Lock enforcement ──────────────────────────────
  if (nodes.length > 0) {
    // 3a: Hydration lock
    if (locks.hydration) {
      const lt = computeTotals(nodes)
      if (lt.totalFlour > 0) {
        const targetLiquid = lt.totalFlour * portioning.targetHyd / 100
        if (lt.totalLiquid > 0 && Math.abs(lt.totalLiquid - targetLiquid) > 0.5) {
          const factor = targetLiquid / lt.totalLiquid
          for (const n of nodes) {
            if (n.data.liquids.length > 0) {
              n.data = { ...n.data, liquids: n.data.liquids.map((l) => ({ ...l, g: rnd(l.g * factor) })) }
            }
          }
        }
      }
    }

    // 3b: Yeast % lock
    if (locks.yeastPct) {
      const yt = computeTotals(nodes)
      if (yt.totalFlour > 0) {
        const currentFreshEquiv = nodes.reduce((a, n) =>
          a + (n.data.yeasts ?? []).reduce((s, y) => {
            const yType = YEAST_TYPES.find((t) => t.key === y.type)
            return s + y.g * (yType?.toFresh ?? 1)
          }, 0), 0)
        const targetFreshEquiv = yt.totalFlour * portioning.yeastPct / 100
        if (currentFreshEquiv > 0 && Math.abs(currentFreshEquiv - targetFreshEquiv) > 0.01) {
          const factor = targetFreshEquiv / currentFreshEquiv
          for (const n of nodes) {
            if ((n.data.yeasts ?? []).length > 0) {
              n.data = { ...n.data, yeasts: (n.data.yeasts ?? []).map((y) => ({ ...y, g: rnd(y.g * factor) })) }
            }
          }
        }
      }
    }

    // 3c: Duration target
    if (locks.yeastPct && !locks.duration) {
      const riseNodes = nodes.filter((n) => n.type === 'rise' && !n.data.userOverrideDuration)
      if (riseNodes.length > 0) {
        const currentTotalRiseMin = riseNodes.reduce((a, n) => a + n.data.baseDur, 0)
        const targetTotalRiseMin = portioning.doughHours * 60
        if (currentTotalRiseMin > 0 && Math.abs(currentTotalRiseMin - targetTotalRiseMin) > 5) {
          const factor = targetTotalRiseMin / currentTotalRiseMin
          for (const n of riseNodes) {
            n.data = { ...n.data, baseDur: Math.max(15, Math.round(n.data.baseDur * factor)) }
          }
        }
      }
    }

    // 3d: Total dough lock
    if (locks.totalDough) {
      const dt = computeTotals(nodes)
      const lockTarget = portioning.lockedTotalDough
        ?? (portioning.mode === 'tray'
          ? Math.round(portioning.tray.l * portioning.tray.w * portioning.thickness * portioning.tray.count)
          : portioning.ball.weight * portioning.ball.count)
      if (dt.totalDough > 0 && Math.abs(dt.totalDough - lockTarget) > 1) {
        const factor = lockTarget / dt.totalDough
        for (const n of nodes) {
          if (DOUGH_NODE_TYPES.has(n.type)) {
            n.data = scaleNodeData(n.data, factor)
          }
        }
      }
    }
  }

  const newPortioning = { ...portioning }

  // ── Phase 4: Generate composition warnings ───────────────────
  const mainDoughForWarnings = nodes.find((n) => n.type === 'dough')
  const mainDoughProps = mainDoughForWarnings ? doughPropsCache.get(mainDoughForWarnings.id) : null
  const warningFlourW = mainDoughProps?.bp.W ?? 280
  const totals = computeTotals(nodes)

  const doughFlours = mainDoughForWarnings?.data.flours ?? []
  const _hasGlutenFreeFlour = doughFlours.some((f) => {
    const entry = getFlour(f.type)
    return isGlutenFree(entry)
  })
  const totalFlourForWG = doughFlours.reduce((a, f) => a + f.g, 0)
  const wholeGrainG = doughFlours.reduce((a, f) => {
    const entry = getFlour(f.type)
    return a + (isWholeGrain(entry) ? f.g : 0)
  }, 0)
  const _wholeGrainPct = totalFlourForWG > 0 ? Math.round(wholeGrainG / totalFlourForWG * 100) : 0

  const doughRuleResults = provider ? getDoughWarnings(provider, {
    doughHours: portioning.doughHours,
    yeastPct: portioning.yeastPct,
    saltPct: portioning.saltPct,
    fatPct: portioning.fatPct,
    hydration: totals.currentHydration || portioning.targetHyd,
    flourW: warningFlourW,
    _hasGlutenFreeFlour, _wholeGrainPct,
    recipeType: meta.type, recipeSubtype: meta.subtype,
  }) : []
  warnings.push(...toActionableWarnings(doughRuleResults, mainDoughForWarnings?.id))

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

  // ── Post-process: strip actions targeting locked fields ──────
  for (const w of warnings) {
    if (!w.actions?.length) continue
    w.actions = w.actions
      .map((a) => ({
        ...a,
        mutations: a.mutations.filter((m) => !isLockedMutation(m, locks)),
      }))
      .filter((a) => a.mutations.length > 0)
    if (w.actions.length === 0) w.actions = undefined
  }

  return {
    graph: { ...graph, nodes, edges },
    portioning: newPortioning,
    warnings,
  }
}
