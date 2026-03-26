/**
 * PreFermentManager — Centralized pre-ferment logic (biga, poolish, lievito madre).
 *
 * Owns:
 * - Pre-ferment ingredient calculation (flour, water, yeast allocation)
 * - Dough adjustment (subtract pre-ferment from main dough)
 * - Validation and warnings
 * - Default configs per pre-ferment type
 *
 * Scientific references:
 * - [C] Casucci Cap. 47-49 (impasto indiretto, biga, poolish)
 * - [C] Casucci Cap. 36-38 (lievito madre)
 * - Biga: 44% hydration, two-phase yeast
 * - Poolish: 100% hydration, two-phase yeast
 * - Madre solido: ~50% hydration, no commercial yeast
 * - Madre liquido (licoli): ~100% hydration, no commercial yeast
 */

import type { RecipeStep, Recipe, PreFermentConfig } from '@commons/types/recipe'
import { rnd } from './format'

// ── Ingredient calculation ─────────────────────────────────────

/**
 * Compute pre-ferment flour, water, yeast from totalDough and config.
 *
 * The formula allocates a percentage of the total dough weight to the pre-ferment,
 * then splits it into flour + water + yeast so that pfFlour + pfWater + pfYeast = pfWeight.
 *
 * [C] Cap. 48 — Biga: flour + 44% water + yeast
 * [C] Cap. 49 — Poolish: flour + 100% water + yeast (equal parts)
 */
export function computePreFermentAmounts(totalDough: number, cfg: PreFermentConfig): {
  pfWeight: number
  pfFlour: number
  pfWater: number
  pfYeast: number
} {
  const pfWeight = rnd(totalDough * (cfg.preFermentPct / 100))
  const yeastRatio = (cfg.yeastPct != null && cfg.yeastPct > 0) ? cfg.yeastPct / 100 : 0
  const pfFlour = rnd(pfWeight / (1 + cfg.hydrationPct / 100 + yeastRatio))
  const pfWater = rnd(pfFlour * (cfg.hydrationPct / 100))
  const pfYeast = yeastRatio > 0 ? rnd(pfFlour * yeastRatio) : 0
  return { pfWeight, pfFlour, pfWater, pfYeast }
}

// ── Validation ─────────────────────────────────────────────────

/** Validate pre-ferment config against available dough resources. */
export function validatePreFerment(
  cfg: PreFermentConfig,
  totalFlour: number,
  totalLiquid: number,
  totalDough: number,
): string[] {
  const errors: string[] = []
  const { pfFlour, pfWater } = computePreFermentAmounts(totalDough, cfg)

  if (cfg.preFermentPct <= 0 || cfg.preFermentPct > 100) {
    errors.push('La percentuale di prefermento deve essere tra 1% e 100%')
  }
  if (cfg.hydrationPct < 40 || cfg.hydrationPct > 130) {
    errors.push("L'idratazione del prefermento deve essere tra 40% e 130%")
  }
  if (pfFlour > totalFlour * 1.01) {
    errors.push("Il prefermento richiede più farina di quella disponibile nella ricetta")
  }
  if (pfWater > totalLiquid * 1.01) {
    errors.push("Il prefermento richiede più liquidi di quelli disponibili nella ricetta")
  }
  return errors
}

// ── Step recalculation ─────────────────────────────────────────

/**
 * Recalculate a pre-ferment step's ingredient arrays from its config and totalDough.
 * Returns a new step with updated flours/liquids/yeasts.
 */
export function recalcPreFermentIngredients(
  step: RecipeStep,
  totalDough: number,
): RecipeStep {
  const cfg = step.preFermentCfg
  if (!cfg) return step

  const { pfFlour, pfWater, pfYeast } = computePreFermentAmounts(totalDough, cfg)

  const flourType = step.flours[0]?.type || 'gt_0_for'
  const flourTemp = step.flours[0]?.temp ?? null
  const liquidType = step.liquids[0]?.type || 'Acqua'
  const liquidTemp = step.liquids[0]?.temp ?? null
  const yeastType = cfg.yeastType || step.yeasts[0]?.type || 'fresh'

  const isTwoPhase = cfg.yeastPct != null && cfg.yeastPct > 0

  return {
    ...step,
    flours: [{ id: 0, type: flourType, g: pfFlour, temp: flourTemp }],
    liquids: [{ id: 0, type: liquidType, g: pfWater, temp: liquidTemp }],
    yeasts: isTwoPhase ? [{ id: 0, type: yeastType, g: pfYeast }] : [],
  }
}

// ── Dough adjustment ───────────────────────────────────────────

/** Get all descendant step IDs (transitive children) via BFS downward. */
function getDescendantIds(stepId: string, steps: RecipeStep[]): Set<string> {
  const descendants = new Set<string>()
  const queue: string[] = [stepId]
  while (queue.length) {
    const id = queue.shift()!
    for (const s of steps) {
      if (s.deps.some((d) => d.id === id) && !descendants.has(s.id)) {
        descendants.add(s.id)
        queue.push(s.id)
      }
    }
  }
  return descendants
}

/**
 * After a pre-ferment changes, adjust the linked dough step's flour/water to be the remainder.
 * Uses target (portioning weight) and targetHyd (target hydration %) to derive
 * the recipe's total flour/liquid — NOT the sum of step ingredients (which is circular).
 */
export function adjustDoughForPreFerment(
  steps: RecipeStep[],
  preFermentId: string,
  target: number,
  targetHyd: number,
): RecipeStep[] {
  const pfStep = steps.find((s) => s.id === preFermentId)
  if (!pfStep?.preFermentCfg) return steps

  const { pfFlour, pfWater } = computePreFermentAmounts(target, pfStep.preFermentCfg)

  const targetFlour = rnd(target / (1 + targetHyd / 100))
  const targetLiquid = rnd(targetFlour * (targetHyd / 100))

  const descendants = getDescendantIds(preFermentId, steps)
  const doughStep = steps.find((s) => s.type === 'dough' && descendants.has(s.id))
  if (!doughStep) return steps

  const remainingFlour = Math.max(0, rnd(targetFlour - pfFlour))
  const remainingWater = Math.max(0, rnd(targetLiquid - pfWater))

  return steps.map((s) => {
    if (s.id !== doughStep.id) return s
    return {
      ...s,
      flours: remainingFlour > 0
        ? (s.flours.length > 0 ? [{ ...s.flours[0], g: remainingFlour }, ...s.flours.slice(1)] : [{ id: 0, type: 'gt_0_for', g: remainingFlour, temp: null }])
        : [],
      liquids: remainingWater > 0
        ? (s.liquids.length > 0 ? [{ ...s.liquids[0], g: remainingWater }, ...s.liquids.slice(1)] : [{ id: 0, type: 'Acqua', g: remainingWater, temp: null }])
        : [],
    }
  })
}

/**
 * Reconcile all pre-ferment steps in a recipe: recalculate ingredients from config
 * and adjust linked dough steps. Call once at recipe load.
 */
export function reconcilePreFerments(recipe: Recipe): Recipe {
  const target = recipe.portioning.mode === 'tray'
    ? Math.round(recipe.portioning.tray.l * recipe.portioning.tray.w * recipe.portioning.thickness * recipe.portioning.tray.count)
    : recipe.portioning.ball.weight * recipe.portioning.ball.count
  const targetHyd = recipe.portioning.targetHyd

  let steps = [...recipe.steps]
  for (const s of steps) {
    if (s.type === 'pre_ferment' && s.preFermentCfg) {
      steps = steps.map((st) =>
        st.id === s.id ? recalcPreFermentIngredients(st, target) : st,
      )
      steps = adjustDoughForPreFerment(steps, s.id, target, targetHyd)
    }
  }
  return { ...recipe, steps }
}
