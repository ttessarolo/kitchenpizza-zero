import type {
  FlourCatalogEntry,
  FlourIngredient,
  LiquidIngredient,
  BlendedFlourProps,
  RiseMethod,
  StepDep,
  RecipeStep,
  Recipe,
  RecipeStatus,
  TemperatureUnit,
  PlanningMode,
  PreFermentConfig,
} from '@commons/types/recipe'

/** Intelligent rounding: >=100 round to int, >=10 round to 0.5, else round to 0.1 */
export function rnd(v: number): number {
  return v >= 100
    ? Math.round(v)
    : v >= 10
      ? Math.round(v * 2) / 2
      : Math.round(v * 10) / 10
}

/** Left-pad a number to 2 digits */
export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format a Date to "HH:MM" */
export function fmtTime(d: Date): string {
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

/** Format minutes: "<60min" or "Xh" or "Xh Ymin" */
export function fmtDuration(m: number): string {
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? h + 'h ' + r + 'min' : h + 'h'
}

/** Convert Celsius to Fahrenheit, rounded */
export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32)
}

/** Convert Fahrenheit to Celsius, rounded */
export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9)
}

/** Next sequential id from an array of items with numeric ids, or 0 if empty */
export function nextId(items: { id: number }[]): number {
  return items.length ? Math.max(...items.map((x) => x.id)) + 1 : 0
}

/** Find a flour by key in the catalog, fallback to index 5 */
export function getFlour(key: string, catalog: FlourCatalogEntry[]): FlourCatalogEntry {
  return catalog.find((f) => f.key === key) || catalog[5]
}

/** Weighted average of flour properties from a blend */
export function blendFlourProperties(
  flours: FlourIngredient[],
  catalog: FlourCatalogEntry[],
): BlendedFlourProps {
  let t = 0
  let wP = 0, wW = 0, wPL = 0, wA = 0, wAsh = 0, wFib = 0, wSD = 0, wFS = 0, wFN = 0

  for (const f of flours) {
    const c = getFlour(f.type, catalog)
    t += f.g
    wP += f.g * c.protein
    wW += f.g * c.W
    wPL += f.g * c.PL
    wA += f.g * c.absorption
    wAsh += f.g * c.ash
    wFib += f.g * c.fiber
    wSD += f.g * c.starchDamage
    wFS += f.g * c.fermentSpeed
    wFN += f.g * (c.fallingNumber ?? 300)
  }

  if (t <= 0) {
    return {
      protein: 12, W: 280, PL: 0.55, absorption: 60, ash: 0.55,
      fiber: 2.5, starchDamage: 7, fermentSpeed: 1, fallingNumber: 300,
    }
  }

  return {
    protein: rnd(wP / t),
    W: Math.round(wW / t),
    PL: rnd((wPL / t) * 100) / 100,
    absorption: Math.round(wA / t),
    ash: rnd((wAsh / t) * 100) / 100,
    fiber: rnd((wFib / t) * 10) / 10,
    starchDamage: rnd((wSD / t) * 10) / 10,
    fermentSpeed: rnd((wFS / t) * 100) / 100,
    fallingNumber: Math.round(wFN / t),
  }
}

/** Estimate W strength from protein percentage (Italian soft wheat correlation) */
export function estimateW(protein: number): number {
  return Math.round(Math.max(60, Math.min(420, 22 * protein - 70)))
}

/** Calculate rise duration in minutes */
export function calcRiseDuration(
  base: number,
  method: string,
  bp: BlendedFlourProps,
  yPct: number,
  ySF: number,
  tf: number,
  riseMethods: RiseMethod[],
): number {
  const rm = riseMethods.find((m) => m.key === method) || riseMethods[0]
  const fnFactor = 300 / Math.max(bp.fallingNumber || 300, 150)
  const fiberFactor = 1 + Math.max(0, ((bp.fiber || 2.5) - 3) * 0.02)
  return Math.round(
    ((base *
      rm.tf *
      (2 / Math.max(yPct, 0.5)) *
      (280 / Math.max(bp.W || 280, 50)) *
      (1 - ((bp.starchDamage || 7) - 7) * 0.02) *
      fnFactor *
      fiberFactor) /
      Math.max(ySF, 0.1)) *
      (tf || 1),
  )
}

/** Calculate final dough temperature */
export function calcFinalDoughTemp(
  flours: FlourIngredient[],
  liquids: LiquidIngredient[],
  ambientTemp: number,
  frictionFactor: number,
): number {
  let t = 0
  let s = 0

  for (const f of flours) {
    t += f.g
    s += f.g * (f.temp ?? ambientTemp)
  }
  for (const l of liquids) {
    t += l.g
    s += l.g * (l.temp ?? ambientTemp)
  }

  const aw = t * 0.15
  t += aw
  s += aw * ambientTemp

  return t > 0 ? Math.round((s / t + frictionFactor) * 10) / 10 : ambientTemp
}

/** Exponential temperature factor for rise based on FDT and rise method */
export function riseTemperatureFactor(fdt: number, riseMethod: string): number {
  return Math.pow(
    2,
    (-(fdt - 24) *
      ({ room: 1, ctrl18: 0.2, ctrl12: 0.1, fridge: 0.05 }[riseMethod] ?? 1)) /
      10,
  )
}

/** Relative date label in Italian: "oggi", "domani", "dopodomani", "tra Ngg", "Ngg fa" */
export function relativeDate(d: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const df = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 864e5,
  )
  return df === 0
    ? 'oggi'
    : df === 1
      ? 'domani'
      : df === 2
        ? 'dopodomani'
        : df < 0
          ? Math.abs(df) + 'gg fa'
          : 'tra ' + df + 'gg'
}

/** Map thickness value to Italian label */
export function thicknessLabel(t: number): string {
  return t <= 0.2
    ? 'Sottilissimo'
    : t <= 0.4
      ? 'Sottile'
      : t <= 0.6
        ? 'Medio'
        : t <= 0.9
          ? 'Alto'
          : t <= 1.4
            ? 'Molto alto'
            : 'Molto spesso'
}

// ── Graph utilities ──────────────────────────────────────────────

/** Normalize a StepDep, adding grams: 1 if missing (backward compat) */
export function migrateStepDep(dep: { id: string; wait: number; grams?: number }): StepDep {
  return { id: dep.id, wait: dep.wait, grams: dep.grams ?? 1 }
}

/** Normalize an entire Recipe JSON (migrate deps, add missing fields) */
export function migrateRecipe(raw: Recipe): Recipe {
  return {
    ...raw,
    steps: raw.steps.map((s) => ({
      ...s,
      deps: s.deps.map(migrateStepDep),
      subtype: s.subtype ?? null,
      restDur: s.restDur ?? 0,
      restTemp: s.restTemp ?? null,
      shapeCount: s.shapeCount ?? null,
      preFermentCfg: s.preFermentCfg ?? null,
      ovenCfg: s.ovenCfg ? { ...s.ovenCfg, shelfPosition: s.ovenCfg.shelfPosition ?? 1 } : null,
    })),
  }
}

/** Get all ancestor step IDs (transitive parents) via BFS upward */
export function getAncestorIds(stepId: string, steps: RecipeStep[]): Set<string> {
  const ancestors = new Set<string>()
  const queue: string[] = []
  const step = steps.find((s) => s.id === stepId)
  if (step) {
    for (const d of step.deps) queue.push(d.id)
  }
  while (queue.length) {
    const id = queue.shift()!
    if (ancestors.has(id)) continue
    ancestors.add(id)
    const parent = steps.find((s) => s.id === id)
    if (parent) {
      for (const d of parent.deps) queue.push(d.id)
    }
  }
  return ancestors
}

/** Get all descendant step IDs (transitive children) via BFS downward */
export function getDescendantIds(stepId: string, steps: RecipeStep[]): Set<string> {
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

/** Get direct child step IDs (steps that have stepId in their deps) */
export function getChildIds(stepId: string, steps: RecipeStep[]): string[] {
  return steps.filter((s) => s.deps.some((d) => d.id === stepId)).map((s) => s.id)
}

/** Validate dependency graph: check for cycles and forward-references */
export function validateDeps(steps: RecipeStep[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const idxMap = new Map(steps.map((s, i) => [s.id, i]))

  for (const s of steps) {
    for (const d of s.deps) {
      const di = idxMap.get(d.id)
      const si = idxMap.get(s.id)!
      if (di === undefined) {
        errors.push(`Step "${s.id}" depends on unknown step "${d.id}"`)
      } else if (di >= si) {
        errors.push(`Step "${s.id}" has forward-reference to "${d.id}"`)
      }
    }
  }

  // Cycle detection via topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const s of steps) {
    inDegree.set(s.id, 0)
    adj.set(s.id, [])
  }
  for (const s of steps) {
    for (const d of s.deps) {
      if (adj.has(d.id)) {
        adj.get(d.id)!.push(s.id)
        inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1)
      }
    }
  }
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }
  let visited = 0
  while (queue.length) {
    const id = queue.shift()!
    visited++
    for (const child of adj.get(id) || []) {
      const nd = (inDegree.get(child) || 1) - 1
      inDegree.set(child, nd)
      if (nd === 0) queue.push(child)
    }
  }
  if (visited < steps.length) {
    errors.push('Dependency graph contains a cycle')
  }

  return { valid: errors.length === 0, errors }
}

/** Sort steps into valid topological order (Kahn's algorithm) */
export function topologicalSort(steps: RecipeStep[]): RecipeStep[] {
  const stepMap = new Map(steps.map((s) => [s.id, s]))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const s of steps) {
    inDegree.set(s.id, 0)
    adj.set(s.id, [])
  }
  for (const s of steps) {
    for (const d of s.deps) {
      if (adj.has(d.id)) {
        adj.get(d.id)!.push(s.id)
        inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1)
      }
    }
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: RecipeStep[] = []
  while (queue.length) {
    const id = queue.shift()!
    sorted.push(stepMap.get(id)!)
    for (const child of adj.get(id) || []) {
      const nd = (inDegree.get(child) || 1) - 1
      inDegree.set(child, nd)
      if (nd === 0) queue.push(child)
    }
  }

  // If some steps couldn't be sorted (cycle), append them at the end
  if (sorted.length < steps.length) {
    for (const s of steps) {
      if (!sorted.find((x) => x.id === s.id)) sorted.push(s)
    }
  }

  return sorted
}

/** Compute total ingredient weight (grams) for a single step */
export function getStepTotalWeight(step: RecipeStep): number {
  return step.flours.reduce((a, f) => a + f.g, 0)
    + step.liquids.reduce((a, l) => a + l.g, 0)
    + step.extras.reduce((a, e) => a + (e.unit ? 0 : e.g), 0)
    + (step.yeasts || []).reduce((a, y) => a + y.g, 0)
}

/** Create a default step with sensible values */
export function createDefaultStep(type: string, group: string, id?: string, subtype?: string | null): RecipeStep {
  return {
    id: id || `step_${Date.now().toString(36)}`,
    title: '',
    type,
    subtype: subtype ?? null,
    group,
    baseDur: type === 'rise' ? 60 : type === 'bake' ? 30 : 10,
    restDur: 0,
    restTemp: null,
    deps: [],
    kneadMethod: type === 'dough' ? 'hand' : null,
    desc: '',
    flours: [],
    liquids: [],
    extras: [],
    yeasts: [],
    riseMethod: type === 'rise' ? 'room' : null,
    ovenCfg: type === 'bake' ? { panType: 'ci_lid', ovenType: 'electric', ovenMode: 'static', temp: 180, cieloPct: 50, shelfPosition: 1 } : null,
    sourcePrep: null,
    shapeCount: type === 'shape' ? 1 : null,
    preFermentCfg: type === 'pre_ferment' ? { preFermentPct: 45, hydrationPct: 44, yeastType: 'fresh', yeastPct: 1, fermentTemp: 18, fermentDur: 1080, roomTempDur: null, starterForm: null } : null,
  }
}

/** Create a default RecipeStatus */
export function createDefaultStatus(ambientTemp = 24, temperatureUnit: TemperatureUnit = 'C'): RecipeStatus {
  const now = new Date()
  return {
    started: true,
    startedAt: Date.now(),
    planningMode: 'forward' as PlanningMode,
    forwardHour: now.getHours(),
    forwardMinute: Math.floor(now.getMinutes() / 5) * 5,
    backwardDay: 1,
    backwardHour: 12,
    backwardMinute: 0,
    ambientTemp,
    temperatureUnit,
    steps: {},
  }
}

/** Remove a step and reconnect its children to its parents */
export function removeStepAndFixDeps(stepId: string, steps: RecipeStep[]): RecipeStep[] {
  const removed = steps.find((s) => s.id === stepId)
  if (!removed) return steps

  const parentDeps = removed.deps

  return steps
    .filter((s) => s.id !== stepId)
    .map((s) => ({
      ...s,
      deps: s.deps.some((d) => d.id === stepId)
        ? [
            ...s.deps.filter((d) => d.id !== stepId),
            ...parentDeps.filter((pd) => !s.deps.some((d) => d.id === pd.id)),
          ]
        : s.deps,
      sourcePrep: s.sourcePrep === stepId ? null : s.sourcePrep,
    }))
}

/** Deep clone a step with a new ID */
export function cloneStep(step: RecipeStep, newId: string): RecipeStep {
  return JSON.parse(JSON.stringify({ ...step, id: newId }))
}

// ── Pre-ferment utilities ────────────────────────────────────────

/** Compute pre-ferment flour, water, yeast from totalDough and config */
export function computePreFermentAmounts(totalDough: number, cfg: PreFermentConfig): {
  pfWeight: number
  pfFlour: number
  pfWater: number
  pfYeast: number
} {
  const pfWeight = rnd(totalDough * (cfg.preFermentPct / 100))
  const pfFlour = rnd(pfWeight / (1 + cfg.hydrationPct / 100))
  const pfWater = rnd(pfFlour * (cfg.hydrationPct / 100))
  const pfYeast = cfg.yeastPct != null && cfg.yeastPct > 0
    ? rnd(pfFlour * (cfg.yeastPct / 100))
    : 0
  return { pfWeight, pfFlour, pfWater, pfYeast }
}

/** Validate pre-ferment config against available dough resources */
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

/** Recalculate a pre-ferment step's ingredient arrays from its config and totalDough.
 *  Returns a new step with updated flours/liquids/yeasts. */
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

/** After a pre-ferment changes, adjust the linked dough step's flour/water to be the remainder.
 *  Returns updated steps array. */
export function adjustDoughForPreFerment(steps: RecipeStep[], preFermentId: string, target: number): RecipeStep[] {
  const pfStep = steps.find((s) => s.id === preFermentId)
  if (!pfStep?.preFermentCfg) return steps

  const { pfFlour, pfWater } = computePreFermentAmounts(target, pfStep.preFermentCfg)

  // Total flour/liquid in the recipe = target split by hydration
  // totalFlour = target / (1 + targetHyd/100)  — but we don't have hydration here
  // Instead, sum ALL flour/liquid across ALL steps to get the recipe's total resources
  const totalFlour = steps.reduce((s, st) => s + st.flours.reduce((a, f) => a + f.g, 0), 0)
  const totalLiquid = steps.reduce((s, st) => s + st.liquids.reduce((a, l) => a + l.g, 0), 0)

  // Find the dough step that depends (transitively) on this pre-ferment
  const descendants = getDescendantIds(preFermentId, steps)
  const doughStep = steps.find((s) => s.type === 'dough' && descendants.has(s.id))
  if (!doughStep) return steps

  const remainingFlour = Math.max(0, rnd(totalFlour - pfFlour))
  const remainingWater = Math.max(0, rnd(totalLiquid - pfWater))

  return steps.map((s) => {
    if (s.id !== doughStep.id) return s
    return {
      ...s,
      flours: s.flours.length > 0
        ? [{ ...s.flours[0], g: remainingFlour }, ...s.flours.slice(1)]
        : remainingFlour > 0 ? [{ id: 0, type: 'gt_0_for', g: remainingFlour, temp: null }] : [],
      liquids: s.liquids.length > 0
        ? [{ ...s.liquids[0], g: remainingWater }, ...s.liquids.slice(1)]
        : remainingWater > 0 ? [{ id: 0, type: 'Acqua', g: remainingWater, temp: null }] : [],
    }
  })
}
