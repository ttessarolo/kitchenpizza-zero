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
  SaltIngredient,
  SugarIngredient,
  FatIngredient,
} from '@commons/types/recipe'

// ── Re-exports from DoughManager (canonical source) ────────────
// These were originally defined here. Now centralized in dough-manager.ts.
// Re-exported for backward compatibility — consumers can import from either.
export {
  getFlour,
  blendFlourProperties,
  estimateW,
  calcYeastPct,
  yeastGrams,
  calcFinalDoughTemp,
  computeSuggestedSalt,
  getSaltPct,
  getSugarPct,
  getFatPct,
  getDoughDefaults,
  getDoughWarnings,
  maxRiseHoursForW,
} from './dough-manager'
export type { DoughWarning, DoughProfileInput } from './dough-manager'

// Re-exports from RiseManager
export { calcRiseDuration, riseTemperatureFactor } from './rise-manager'

// Re-exports from PreFermentManager
export {
  computePreFermentAmounts,
  validatePreFerment,
  recalcPreFermentIngredients,
  adjustDoughForPreFerment,
  reconcilePreFerments,
} from './pre-ferment-manager'

// Re-exports from format.ts (pure display helpers — safe for client-side)
export {
  rnd, pad, fmtTime, fmtDuration,
  celsiusToFahrenheit, fahrenheitToCelsius,
  nextId, relativeDate, thicknessLabel,
} from './format'

// Local alias for internal use
import { rnd } from './format'

// getFlour, blendFlourProperties, estimateW → moved to dough-manager.ts (re-exported above)

// calcRiseDuration, riseTemperatureFactor → moved to rise-manager.ts (re-exported above)

// relativeDate, thicknessLabel → moved to format.ts (re-exported above)

// ── Graph utilities ──────────────────────────────────────────────

/** Normalize a StepDep, adding grams: 1 if missing (backward compat) */
export function migrateStepDep(dep: { id: string; wait: number; grams?: number }): StepDep {
  return { id: dep.id, wait: dep.wait, grams: dep.grams ?? 1 }
}

/** Normalize an entire Recipe JSON (migrate deps, add missing fields) */
export function migrateRecipe(raw: Recipe): Recipe {
  return {
    ...raw,
    steps: raw.steps.map((s) => {
      // Migrate salt/sugar from extras to dedicated arrays
      const saltNames = ['Sale', 'Sale fino', 'Sale marino', 'Sale Maldon']
      const sugarNames = ['Zucchero', 'Miele', 'Miele di acacia', 'Malto', 'Malto diastatico']
      const fatNames = ['Olio', 'Burro', 'Strutto', 'Margarina']
      const migratedSalts = (s.extras || [])
        .filter(e => saltNames.some(n => e.name.toLowerCase().includes(n.toLowerCase())))
        .map((e, i) => ({ id: i, type: 'sale_fino', g: e.g }))
      const migratedSugars = (s.extras || [])
        .filter(e => sugarNames.some(n => e.name.toLowerCase().includes(n.toLowerCase())))
        .map((e, i) => {
          const name = e.name.toLowerCase()
          const type = name.includes('miele') ? 'miele' : name.includes('malto') ? 'malto_d' : 'zucchero'
          return { id: i, type, g: e.g }
        })
      const migratedFats = (s.extras || [])
        .filter(e => fatNames.some(n => e.name.toLowerCase().includes(n.toLowerCase())))
        .map((e, i) => {
          const name = e.name.toLowerCase()
          const type = name.includes('burro') ? 'burro' : name.includes('strutto') ? 'strutto' : name.includes('margarina') ? 'margarina' : 'olio_evo'
          return { id: i, type, g: e.g }
        })
      const cleanedExtras = (s.extras || []).filter(e =>
        !saltNames.some(n => e.name.toLowerCase().includes(n.toLowerCase())) &&
        !sugarNames.some(n => e.name.toLowerCase().includes(n.toLowerCase())) &&
        !fatNames.some(n => e.name.toLowerCase().includes(n.toLowerCase()))
      )

      return {
        ...s,
        deps: s.deps.map(migrateStepDep),
        subtype: s.subtype ?? null,
        restDur: s.restDur ?? 0,
        restTemp: s.restTemp ?? null,
        shapeCount: s.shapeCount ?? null,
        preFermentCfg: s.preFermentCfg ?? null,
        ovenCfg: s.ovenCfg ? { ...s.ovenCfg, shelfPosition: s.ovenCfg.shelfPosition ?? 1 } : null,
        salts: s.salts?.length ? s.salts : migratedSalts,
        sugars: s.sugars?.length ? s.sugars : migratedSugars,
        fats: s.fats ?? (migratedFats.length ? migratedFats : []),
        extras: s.salts?.length || s.sugars?.length ? s.extras : cleanedExtras,
      }
    }),
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
    + (step.salts || []).reduce((a, s) => a + s.g, 0)
    + (step.sugars || []).reduce((a, s) => a + s.g, 0)
    + (step.fats || []).reduce((a, f) => a + f.g, 0)
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
    salts: [],
    sugars: [],
    fats: [],
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

/** Merge source step's ingredients into target, scaled by factor */
function mergeStepIngredients(
  target: RecipeStep,
  source: RecipeStep,
  factor: number,
): RecipeStep {
  return {
    ...target,
    flours: mergeIngArray(target.flours, source.flours, factor),
    liquids: mergeIngArray(target.liquids, source.liquids, factor),
    extras: mergeIngArray(target.extras, source.extras, factor),
    yeasts: mergeIngArray(target.yeasts ?? [], source.yeasts ?? [], factor),
    salts: mergeIngArray(target.salts ?? [], source.salts ?? [], factor),
    sugars: mergeIngArray(target.sugars ?? [], source.sugars ?? [], factor),
    fats: mergeIngArray(target.fats ?? [], source.fats ?? [], factor),
  }
}

function mergeIngArray<T extends { type: string; g: number }>(
  target: T[],
  source: T[],
  factor: number,
): T[] {
  const result = target.map((t) => ({ ...t }))
  for (const s of source) {
    const scaled = Math.round(s.g * factor)
    if (scaled <= 0) continue
    const existing = result.find((r) => r.type === s.type)
    if (existing) {
      existing.g += scaled
    } else {
      result.push({ ...s, g: scaled })
    }
  }
  return result
}

/** Remove a step, transfer its ingredients to children, and reconnect deps */
export function removeStepAndFixDeps(stepId: string, steps: RecipeStep[]): RecipeStep[] {
  const removed = steps.find((s) => s.id === stepId)
  if (!removed) return steps

  const parentDeps = removed.deps
  const childIds = new Set(
    steps.filter((s) => s.deps.some((d) => d.id === stepId)).map((s) => s.id),
  )

  return steps
    .filter((s) => s.id !== stepId)
    .map((s) => {
      if (!childIds.has(s.id)) {
        return {
          ...s,
          sourcePrep: s.sourcePrep === stepId ? null : s.sourcePrep,
        }
      }

      // This step depended on the deleted step
      const depOnRemoved = s.deps.find((d) => d.id === stepId)!
      const gramsFactor = depOnRemoved.grams

      // Reconnect deps: compose grams through the deleted step
      const newDeps = [
        ...s.deps.filter((d) => d.id !== stepId),
        ...parentDeps
          .filter((pd) => !s.deps.some((d) => d.id === pd.id))
          .map((pd) => ({ ...pd, grams: pd.grams * gramsFactor })),
      ]

      // Merge deleted step's ingredients into this child
      const merged = mergeStepIngredients(s, removed, gramsFactor)

      return {
        ...merged,
        deps: newDeps,
        sourcePrep: s.sourcePrep === stepId
          ? (parentDeps.length === 1 ? parentDeps[0].id : null)
          : s.sourcePrep,
      }
    })
}

/** Deep clone a step with a new ID */
export function cloneStep(step: RecipeStep, newId: string): RecipeStep {
  return JSON.parse(JSON.stringify({ ...step, id: newId }))
}

// Salt & sugar utilities → moved to dough-manager.ts (re-exported above)

// Pre-ferment utilities → moved to pre-ferment-manager.ts (re-exported above)
