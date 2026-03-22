import { useState, useMemo, useCallback } from 'react'
import type {
  Recipe,
  RecipeStep,
  Portioning,
  ScheduledStep,
  TimeSummary,
  TemperatureUnit,
  PlanningMode,
  FlourIngredient,
  LiquidIngredient,
  ExtraIngredient,
  YeastIngredient,
  PortioningMode,
  RecipeStatus,
} from '@commons/types/recipe'
import {
  rnd,
  celsiusToFahrenheit,
  blendFlourProperties,
  calcRiseDuration,
  calcFinalDoughTemp,
  riseTemperatureFactor,
  migrateRecipe,
  getStepTotalWeight,
  getChildIds,
  removeStepAndFixDeps,
  cloneStep,
  createDefaultStep,
  createDefaultStatus,
  topologicalSort,
  validateDeps,
} from '@commons/utils/recipe'
import {
  RECIPE_SUBTYPES,
  TRAY_MATERIALS,
  FLOUR_CATALOG,
  RISE_METHODS,
  YEAST_TYPES,
  KNEAD_METHODS,
} from '@/local_data'

// ── Grouped ingredients type ──────────────────────────────────────
export interface GroupedIngredients {
  flours: FlourIngredient[]
  liquids: LiquidIngredient[]
  extras: ExtraIngredient[]
  yeasts: YeastIngredient[]
}

// ── Hook return type ──────────────────────────────────────────────
export interface RecipeCalculator {
  // Layer 1 — Base
  recipe: Recipe
  editMode: boolean

  // Layer 2 — Status
  status: RecipeStatus | null

  // UI state
  openStep: string | null
  temperatureUnit: TemperatureUnit
  ambientTemp: number
  planningMode: PlanningMode
  forwardHour: number
  forwardMinute: number
  backwardDay: number
  backwardHour: number
  backwardMinute: number

  // Backward compat (derived from status)
  doneMap: Record<string, boolean>
  doneTimestamps: Record<string, number>
  started: boolean

  // Derived
  totalFlour: number
  totalLiquid: number
  totalExtras: number
  totalYeast: number
  totalDough: number
  currentHydration: number
  target: number
  trayTotalDough: number
  ballTotalDough: number
  groupedIngredients: Record<string, GroupedIngredients>
  stepsWithDuration: (RecipeStep & { dur: number })[]
  span: number
  startTime: Date
  schedule: ScheduledStep[]
  endTime: Date | null
  timeSummary: TimeSummary
  nextUndoneStep: string | undefined
  currentSubtypes: { key: string; label: string; defaults: { mode: PortioningMode; hyd: number; thickness: number; ballG: number } }[]

  // Actions — state setters
  setRecipe: React.Dispatch<React.SetStateAction<Recipe>>
  setOpenStep: (id: string | null) => void
  setTemperatureUnit: (u: TemperatureUnit) => void
  setAmbientTemp: (t: number) => void
  setPlanningMode: (m: PlanningMode) => void
  setForwardHour: (h: number) => void
  setForwardMinute: (m: number) => void
  setBackwardDay: (d: number) => void
  setBackwardHour: (h: number) => void
  setBackwardMinute: (m: number) => void
  setEditMode: (m: boolean) => void

  // Actions — recipe mutation
  scaleAll: (newTotal: number) => void
  setHydration: (h: number) => void
  setStepHydration: (stepId: string, h: number) => void
  updateStep: (id: string, fn: (s: RecipeStep) => RecipeStep) => void
  updateStepField: (id: string, field: string, value: unknown) => void
  updatePortioning: (fn: (p: Portioning) => Portioning) => void
  handlePortioningChange: (np: Portioning) => void
  applyDefaults: (typeKey: string, subtypeKey: string) => void

  // Actions — CRUD
  addStep: (afterStepId: string, type: string) => void
  deleteStep: (stepId: string) => void
  duplicateStepAction: (stepId: string) => void
  reorderSteps: (fromIndex: number, toIndex: number) => { valid: boolean; errors: string[] }

  // Actions — dependency editing
  addDep: (stepId: string, parentId: string) => void
  removeDep: (stepId: string, parentId: string) => void
  updateDep: (stepId: string, parentId: string, field: 'wait' | 'grams', value: number) => void
  getValidParents: (stepId: string) => RecipeStep[]

  // Actions — execution
  handleStart: () => void
  handleDone: (id: string) => void
  handleUndone: (id: string) => void
  handleNow: () => void
  clearStatus: () => void

  // Display
  displayTemp: (c: number) => string
  getStepDuration: (s: RecipeStep) => number
  getFDT: (s: RecipeStep | null) => number
}

export function useRecipeCalculator(initialRecipe: Recipe): RecipeCalculator {
  // ── Layer 1: Base recipe ───────────────────────────────────────
  const [recipe, setRecipe] = useState<Recipe>(() => migrateRecipe(JSON.parse(JSON.stringify(initialRecipe))))

  // ── Layer 2: Execution status ──────────────────────────────────
  const [status, setStatus] = useState<RecipeStatus | null>(null)

  // ── Edit mode ──────────────────────────────────────────────────
  const [editModeInternal, setEditModeInternal] = useState(true)
  const editMode = status ? false : editModeInternal
  const setEditMode = useCallback((m: boolean) => {
    if (!status) setEditModeInternal(m)
  }, [status])

  // ── UI state ───────────────────────────────────────────────────
  const [openStep, setOpenStep] = useState<string | null>(null)
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('C')
  const [ambientTemp, setAmbientTemp] = useState(24)
  const [planningMode, setPlanningMode] = useState<PlanningMode>('forward')

  const now = new Date()
  const [forwardHour, setForwardHour] = useState(now.getHours())
  const [forwardMinute, setForwardMinute] = useState(Math.floor(now.getMinutes() / 5) * 5)
  const [backwardDay, setBackwardDay] = useState(1)
  const [backwardHour, setBackwardHour] = useState(12)
  const [backwardMinute, setBackwardMinute] = useState(0)

  // ── Backward compat: derive doneMap/doneTimestamps/started from status ──
  const doneMap = useMemo(() => {
    if (!status) return {}
    const m: Record<string, boolean> = {}
    for (const [id, s] of Object.entries(status.steps)) {
      if (s.done) m[id] = true
    }
    return m
  }, [status])

  const doneTimestamps = useMemo(() => {
    if (!status) return {}
    const m: Record<string, number> = {}
    for (const [id, s] of Object.entries(status.steps)) {
      if (s.done && s.doneAt) m[id] = s.doneAt
    }
    return m
  }, [status])

  const started = status?.started ?? false

  const { portioning: po, steps, ingredientGroups: ig } = recipe

  // ── Display helpers ──────────────────────────────────────────
  const displayTemp = (c: number): string =>
    temperatureUnit === 'F' ? celsiusToFahrenheit(c) + ' °F' : c + ' °C'

  const trayArea = po.tray.l * po.tray.w
  const trayTotalDough = Math.round(trayArea * po.thickness * po.tray.count)
  const ballTotalDough = po.ball.weight * po.ball.count
  const target = po.mode === 'tray' ? trayTotalDough : ballTotalDough

  // ── Totals ───────────────────────────────────────────────────
  const totalFlour = steps.reduce((s, st) => s + st.flours.reduce((a, f) => a + f.g, 0), 0)
  const totalLiquid = steps.reduce((s, st) => s + st.liquids.reduce((a, l) => a + l.g, 0), 0)
  const totalExtras = steps.reduce(
    (s, st) => s + st.extras.reduce((a, e) => a + (e.unit ? 0 : e.g), 0),
    0,
  )
  const totalYeast = steps.reduce(
    (s, st) => s + (st.yeasts || []).reduce((a, y) => a + y.g, 0),
    0,
  )
  const totalDough = totalFlour + totalLiquid + totalExtras + totalYeast
  const currentHydration = totalFlour > 0 ? Math.round((totalLiquid / totalFlour) * 100) : 0

  // ── Scale helpers ──────────────────────────────────────────────
  function scaleStepIngredients(s: RecipeStep, f: number): RecipeStep {
    return {
      ...s,
      flours: s.flours.map((x) => ({ ...x, g: rnd(x.g * f) })),
      liquids: s.liquids.map((x) => ({ ...x, g: rnd(x.g * f) })),
      extras: s.extras.map((x) => (x.unit ? x : { ...x, g: rnd(x.g * f) })),
      yeasts: (s.yeasts || []).map((x) => ({ ...x, g: rnd(x.g * f) })),
    }
  }

  // ── Scale all ingredients ────────────────────────────────────
  function scaleAll(n: number) {
    if (totalDough <= 0) return
    const f = n / totalDough
    setRecipe((p) => ({
      ...p,
      steps: p.steps.map((s) => scaleStepIngredients(s, f)),
    }))
  }

  // ── Set global hydration ─────────────────────────────────────
  function setHydration(h: number) {
    const t = (totalFlour * h) / 100
    if (totalLiquid <= 0) return
    const f = t / totalLiquid
    setRecipe((p) => ({
      ...p,
      steps: p.steps.map((s) => ({
        ...s,
        liquids: s.liquids.map((l) => ({ ...l, g: rnd(l.g * f) })),
      })),
    }))
  }

  // ── Set step hydration ───────────────────────────────────────
  function setStepHydration(sid: string, h: number) {
    updateStep(sid, (s) => {
      const sf = s.flours.reduce((a, f) => a + f.g, 0)
      const sl = s.liquids.reduce((a, l) => a + l.g, 0)
      if (sf <= 0 || sl <= 0) return s
      return {
        ...s,
        liquids: s.liquids.map((l) => ({
          ...l,
          g: rnd((l.g * ((sf * h) / 100)) / sl),
        })),
      }
    })
  }

  // ── Update step with auto-scale propagation ────────────────────
  function updateStep(id: string, fn: (s: RecipeStep) => RecipeStep) {
    setRecipe((p) => {
      const oldStep = p.steps.find((s) => s.id === id)
      const newSteps = p.steps.map((s) => (s.id === id ? fn(s) : s))
      const newStep = newSteps.find((s) => s.id === id)

      // Auto-scale children if ingredient weight changed
      if (oldStep && newStep) {
        const oldWeight = getStepTotalWeight(oldStep)
        const newWeight = getStepTotalWeight(newStep)
        if (oldWeight > 0 && newWeight > 0 && Math.abs(newWeight - oldWeight) > 0.01) {
          const ratio = newWeight / oldWeight
          const childIds = getChildIds(id, p.steps)
          if (childIds.length > 0) {
            return {
              ...p,
              steps: propagateScale(newSteps, id, ratio),
            }
          }
        }
      }

      return { ...p, steps: newSteps }
    })
  }

  // ── Recursive auto-scale propagation ─────────────────────────
  function propagateScale(steps: RecipeStep[], parentId: string, ratio: number): RecipeStep[] {
    const childIds = getChildIds(parentId, steps)
    let result = [...steps]

    for (const childId of childIds) {
      const childIdx = result.findIndex((s) => s.id === childId)
      if (childIdx === -1) continue

      const child = result[childIdx]
      const dep = child.deps.find((d) => d.id === parentId)
      if (!dep || dep.grams <= 0) continue

      const scaledChild = scaleStepIngredients(child, ratio)
      result[childIdx] = scaledChild

      // Recurse to grandchildren
      const childOldWeight = getStepTotalWeight(child)
      const childNewWeight = getStepTotalWeight(scaledChild)
      if (childOldWeight > 0 && childNewWeight > 0) {
        result = propagateScale(result, childId, childNewWeight / childOldWeight)
      }
    }

    return result
  }

  // ── Update step field ────────────────────────────────────────
  function updateStepField(id: string, field: string, value: unknown) {
    if (field === 'sourcePrep') {
      // Bidirectional sync: sourcePrep → deps
      setRecipe((p) => ({
        ...p,
        steps: p.steps.map((s) => {
          if (s.id !== id) return s
          const newSourcePrep = (value as string) || null
          let newDeps = s.deps

          if (newSourcePrep) {
            // Remove old dough/pre_dough deps, add new one
            newDeps = [
              ...s.deps.filter((d) => {
                const t = p.steps.find((x) => x.id === d.id)?.type
                return t !== 'dough' && t !== 'pre_dough'
              }),
              { id: newSourcePrep, wait: 1, grams: 1 },
            ]
          }

          return { ...s, sourcePrep: newSourcePrep, deps: newDeps }
        }),
      }))
    } else {
      updateStep(id, (s) => ({ ...s, [field]: value }))
    }
  }

  // ── Update portioning ────────────────────────────────────────
  function updatePortioning(fn: (p: Portioning) => Portioning) {
    setRecipe((p) => ({ ...p, portioning: fn(p.portioning) }))
  }

  // ── Handle portioning change with scaling ────────────────────
  function handlePortioningChange(np: Portioning) {
    const nt =
      np.mode === 'tray'
        ? np.tray.l * np.tray.w * np.thickness * np.tray.count
        : np.ball.weight * np.ball.count
    setRecipe((p) => {
      const old = p.steps.reduce(
        (s, st) =>
          s +
          st.flours.reduce((a, f) => a + f.g, 0) +
          st.liquids.reduce((a, l) => a + l.g, 0) +
          st.extras.reduce((a, e) => a + (e.unit ? 0 : e.g), 0) +
          (st.yeasts || []).reduce((a, y) => a + y.g, 0),
        0,
      )
      if (old <= 0) return { ...p, portioning: np }
      const f = nt / old
      return {
        ...p,
        portioning: np,
        steps: p.steps.map((s) => scaleStepIngredients(s, f)),
      }
    })
  }

  // ── Apply subtype defaults ───────────────────────────────────
  function applyDefaults(tk: string, sk: string) {
    const subs = RECIPE_SUBTYPES[tk] || []
    const sub = subs.find((s) => s.key === sk)
    if (!sub) return
    const d = sub.defaults
    const np = { ...po, mode: d.mode } as Portioning
    if (d.thickness) np.thickness = d.thickness
    if (d.ballG) np.ball = { ...np.ball, weight: d.ballG }
    handlePortioningChange(np)
    if (d.hyd) setTimeout(() => setHydration(d.hyd), 50)
  }

  // ── CRUD: Add step ─────────────────────────────────────────────
  function addStep(afterStepId: string, type: string) {
    setRecipe((p) => {
      const afterIdx = p.steps.findIndex((s) => s.id === afterStepId)
      if (afterIdx === -1) return p

      const afterStep = p.steps[afterIdx]
      const newStep = createDefaultStep(type, afterStep.group)
      newStep.deps = [{ id: afterStepId, wait: 1, grams: 1 }]

      const newSteps = [...p.steps]
      newSteps.splice(afterIdx + 1, 0, newStep)

      // If the step after afterStep depended on afterStep, update it to depend on newStep
      for (let i = afterIdx + 2; i < newSteps.length; i++) {
        const s = newSteps[i]
        if (s.deps.some((d) => d.id === afterStepId)) {
          newSteps[i] = {
            ...s,
            deps: s.deps.map((d) =>
              d.id === afterStepId ? { ...d, id: newStep.id } : d,
            ),
          }
          break // Only update the first one
        }
      }

      return { ...p, steps: newSteps }
    })
  }

  // ── CRUD: Delete step ──────────────────────────────────────────
  function deleteStep(stepId: string) {
    setRecipe((p) => ({
      ...p,
      steps: removeStepAndFixDeps(stepId, p.steps),
    }))
  }

  // ── CRUD: Duplicate step ───────────────────────────────────────
  function duplicateStepAction(stepId: string) {
    setRecipe((p) => {
      const idx = p.steps.findIndex((s) => s.id === stepId)
      if (idx === -1) return p

      const original = p.steps[idx]
      const newId = `${stepId}_copy_${Date.now().toString(36)}`
      const clone = cloneStep(original, newId)
      // Clone depends on the same parents as the original
      clone.deps = original.deps.map((d) => ({ ...d }))

      const newSteps = [...p.steps]
      newSteps.splice(idx + 1, 0, clone)
      return { ...p, steps: newSteps }
    })
  }

  // ── CRUD: Reorder steps ────────────────────────────────────────
  function reorderSteps(fromIndex: number, toIndex: number): { valid: boolean; errors: string[] } {
    let result = { valid: true, errors: [] as string[] }
    setRecipe((p) => {
      const newSteps = [...p.steps]
      const [moved] = newSteps.splice(fromIndex, 1)
      newSteps.splice(toIndex, 0, moved)

      result = validateDeps(newSteps)
      if (!result.valid) {
        // Auto-fix: topological sort
        const sorted = topologicalSort(newSteps)
        result = validateDeps(sorted)
        return { ...p, steps: sorted }
      }

      return { ...p, steps: newSteps }
    })
    return result
  }

  // ── Dep editing: Add dependency ────────────────────────────────
  function addDep(stepId: string, parentId: string) {
    setRecipe((p) => ({
      ...p,
      steps: p.steps.map((s) => {
        if (s.id !== stepId) return s
        if (s.deps.some((d) => d.id === parentId)) return s // Already exists

        const parentStep = p.steps.find((x) => x.id === parentId)
        const newDeps = [...s.deps, { id: parentId, wait: 1, grams: 1 }]

        // Bidirectional sync: if parent is dough/pre_dough and step is rise/shape, set sourcePrep
        let newSourcePrep = s.sourcePrep
        if (parentStep && (parentStep.type === 'dough' || parentStep.type === 'pre_dough')) {
          if (s.type === 'rise' || s.type === 'shape') {
            newSourcePrep = parentId
          }
        }

        return { ...s, deps: newDeps, sourcePrep: newSourcePrep }
      }),
    }))
  }

  // ── Dep editing: Remove dependency ─────────────────────────────
  function removeDep(stepId: string, parentId: string) {
    setRecipe((p) => ({
      ...p,
      steps: p.steps.map((s) => {
        if (s.id !== stepId) return s
        return {
          ...s,
          deps: s.deps.filter((d) => d.id !== parentId),
          sourcePrep: s.sourcePrep === parentId ? null : s.sourcePrep,
        }
      }),
    }))
  }

  // ── Dep editing: Update dependency field ────────────────────────
  function updateDep(stepId: string, parentId: string, field: 'wait' | 'grams', value: number) {
    const clamped = Math.max(0, Math.min(1, value))
    setRecipe((p) => ({
      ...p,
      steps: p.steps.map((s) => {
        if (s.id !== stepId) return s
        return {
          ...s,
          deps: s.deps.map((d) =>
            d.id === parentId ? { ...d, [field]: clamped } : d,
          ),
        }
      }),
    }))
  }

  // ── Get valid parents for a step ───────────────────────────────
  function getValidParents(stepId: string): RecipeStep[] {
    const stepIdx = steps.findIndex((s) => s.id === stepId)
    if (stepIdx === -1) return []
    // Only steps before this one in the array (topological order)
    return steps.slice(0, stepIdx).filter((s) => s.id !== stepId)
  }

  // ── Grouped ingredients ──────────────────────────────────────
  const groupedIngredients = useMemo(() => {
    const g: Record<string, GroupedIngredients> = {}
    for (const grp of ig)
      g[grp] = { flours: [], liquids: [], extras: [], yeasts: [] }
    for (const s of steps) {
      const gr = g[s.group]
      if (!gr) continue
      for (const f of s.flours) {
        const e = gr.flours.find((x) => x.type === f.type)
        if (e) e.g += f.g
        else gr.flours.push({ ...f })
      }
      for (const l of s.liquids) {
        const e = gr.liquids.find((x) => x.type === l.type)
        if (e) e.g += l.g
        else gr.liquids.push({ ...l })
      }
      for (const e of s.extras) {
        const ex = gr.extras.find((x) => x.name === e.name)
        if (ex) ex.g += e.g
        else gr.extras.push({ ...e })
      }
      for (const y of s.yeasts || []) {
        const ex = gr.yeasts.find((x) => x.type === y.type)
        if (ex) ex.g += y.g
        else gr.yeasts.push({ ...y })
      }
    }
    return g
  }, [steps, ig])

  // ── Yeast data for a rise step ───────────────────────────────
  function getYeastData(rs: RecipeStep) {
    const src = rs.sourcePrep ? steps.find((s) => s.id === rs.sourcePrep) : null
    const ys = src ? src.yeasts || [] : []
    if (!ys.length)
      return { fe: 0, sf: 1, fl: totalFlour, bp: blendFlourProperties(src ? src.flours : [], FLOUR_CATALOG as unknown as import('@commons/types/recipe').FlourCatalogEntry[]) }
    let fe = 0
    let ws = 0
    for (const y of ys) {
      const yt = YEAST_TYPES.find((t) => t.key === y.type) || YEAST_TYPES[0]
      const f = y.g * yt.toFresh
      fe += f
      ws += f * yt.speedF
    }
    return {
      fe,
      sf: fe > 0 ? ws / fe : 1,
      fl: (src ? src.flours.reduce((a, f) => a + f.g, 0) : totalFlour) || totalFlour,
      bp: blendFlourProperties(src ? src.flours : [], FLOUR_CATALOG as unknown as import('@commons/types/recipe').FlourCatalogEntry[]),
    }
  }

  // ── Get FDT for a step ───────────────────────────────────────
  function getFDT(ps: RecipeStep | null): number {
    if (!ps || !ps.flours.length) return ambientTemp
    const km = KNEAD_METHODS.find((m) => m.key === ps.kneadMethod) || KNEAD_METHODS[0]
    return calcFinalDoughTemp(ps.flours, ps.liquids, ambientTemp, km.ff)
  }

  // ── Step duration calculation ────────────────────────────────
  function getStepDuration(s: RecipeStep): number {
    if (s.type === 'rise' && s.riseMethod) {
      const yd = getYeastData(s)
      const yP = yd.fl > 0 ? (yd.fe / yd.fl) * 100 : 2
      const src = s.sourcePrep ? steps.find((st) => st.id === s.sourcePrep) ?? null : null
      return calcRiseDuration(
        s.baseDur,
        s.riseMethod,
        yd.bp,
        yP,
        yd.sf,
        riseTemperatureFactor(getFDT(src), s.riseMethod),
        RISE_METHODS as unknown as import('@commons/types/recipe').RiseMethod[],
      )
    }
    if (s.type === 'bake' && s.ovenCfg) {
      const tm = TRAY_MATERIALS.find((m) => m.key === s.ovenCfg!.panType) || TRAY_MATERIALS[0]
      return Math.max(
        10,
        Math.round(((tm.bMin + tm.bMax) / 2 * tm.defTemp) / Math.max(s.ovenCfg.temp, 100)),
      )
    }
    return s.baseDur
  }

  // ── Steps with duration ──────────────────────────────────────
  const stepsWithDuration = useMemo(
    () => steps.map((s) => ({ ...s, dur: getStepDuration(s) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps, ambientTemp],
  )

  // ── Total span ───────────────────────────────────────────────
  const span = useMemo(() => {
    const t0 = new Date(2000, 0, 1)
    let mx = t0
    const tmp: { id: string; s: Date; e: Date }[] = []
    for (const s of stepsWithDuration) {
      let e = t0
      for (const d of s.deps) {
        const x = tmp.find((r) => r.id === d.id)
        if (x) {
          const t = new Date(x.s.getTime() + (x.e.getTime() - x.s.getTime()) * d.wait)
          if (t > e) e = t
        }
      }
      const st = new Date(e)
      const en = new Date(st.getTime() + s.dur * 60000)
      tmp.push({ id: s.id, s: st, e: en })
      if (en > mx) mx = en
    }
    return Math.round((mx.getTime() - t0.getTime()) / 60000)
  }, [stepsWithDuration])

  // ── Start time ───────────────────────────────────────────────
  const startTime = useMemo(() => {
    if (planningMode === 'forward')
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), forwardHour, forwardMinute)
    return new Date(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + backwardDay,
        backwardHour,
        backwardMinute,
      ).getTime() - span * 60000,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planningMode, forwardHour, forwardMinute, backwardDay, backwardHour, backwardMinute, span])

  // ── Schedule ─────────────────────────────────────────────────
  const schedule = useMemo(() => {
    const r: ScheduledStep[] = []
    for (const s of stepsWithDuration) {
      let e = startTime
      for (const d of s.deps) {
        const x = r.find((z) => z.id === d.id)
        if (x) {
          const dE = x.aE || x.end
          const t = new Date(x.start.getTime() + (dE.getTime() - x.start.getTime()) * d.wait)
          if (t > e) e = t
        }
      }
      r.push({
        ...s,
        start: new Date(e),
        end: new Date(e.getTime() + s.dur * 60000),
        aE: doneMap[s.id] && doneTimestamps[s.id] ? new Date(doneTimestamps[s.id]) : null,
      })
    }
    return r
  }, [stepsWithDuration, startTime, doneMap, doneTimestamps])

  // ── End time ─────────────────────────────────────────────────
  const endTime = schedule.length
    ? schedule[schedule.length - 1].aE || schedule[schedule.length - 1].end
    : null

  // ── Time summary ─────────────────────────────────────────────
  const timeSummary = useMemo(() => {
    const c: Record<string, number> = {}
    stepsWithDuration.forEach((s) => {
      c[s.type] = (c[s.type] || 0) + s.dur
    })
    return {
      total: span,
      prep: (c.pre_dough || 0) + (c.dough || 0) + (c.rest || 0) + (c.shape || 0),
      rise: c.rise || 0,
      bake: c.bake || 0,
    }
  }, [stepsWithDuration, span])

  // ── Next undone step ─────────────────────────────────────────
  const nextUndoneStep = stepsWithDuration.find((p) => !doneMap[p.id])?.id

  // ── Action handlers ──────────────────────────────────────────
  const handleDone = (id: string) => {
    setStatus((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        steps: {
          ...prev.steps,
          [id]: { done: true, doneAt: Date.now() },
        },
      }
    })
  }

  const handleUndone = (id: string) => {
    const i = stepsWithDuration.findIndex((p) => p.id === id)
    setStatus((prev) => {
      if (!prev) return prev
      const newSteps = { ...prev.steps }
      for (let j = i; j < stepsWithDuration.length; j++) {
        delete newSteps[stepsWithDuration[j].id]
      }
      return { ...prev, steps: newSteps }
    })
  }

  const handleStart = () => {
    const n = new Date()
    setPlanningMode('forward')
    setForwardHour(n.getHours())
    setForwardMinute(Math.floor(n.getMinutes() / 5) * 5)
    setStatus(createDefaultStatus(ambientTemp, temperatureUnit))
  }

  const clearStatus = () => {
    setStatus(null)
    setEditModeInternal(true)
  }

  const handleNow = () => {
    const n = new Date()
    setForwardHour(n.getHours())
    setForwardMinute(Math.floor(n.getMinutes() / 5) * 5)
  }

  const currentSubtypes = RECIPE_SUBTYPES[recipe.meta.type] || []

  return {
    recipe,
    editMode,
    status,

    openStep,
    temperatureUnit,
    ambientTemp,
    planningMode,
    forwardHour,
    forwardMinute,
    backwardDay,
    backwardHour,
    backwardMinute,

    // Backward compat
    doneMap,
    doneTimestamps,
    started,

    totalFlour,
    totalLiquid,
    totalExtras,
    totalYeast,
    totalDough,
    currentHydration,
    target,
    trayTotalDough,
    ballTotalDough,
    groupedIngredients,
    stepsWithDuration,
    span,
    startTime,
    schedule,
    endTime,
    timeSummary,
    nextUndoneStep,
    currentSubtypes,

    setRecipe,
    setOpenStep,
    setTemperatureUnit,
    setAmbientTemp,
    setPlanningMode,
    setForwardHour,
    setForwardMinute,
    setBackwardDay,
    setBackwardHour,
    setBackwardMinute,
    setEditMode,

    scaleAll,
    setHydration,
    setStepHydration,
    updateStep,
    updateStepField,
    updatePortioning,
    handlePortioningChange,
    applyDefaults,

    addStep,
    deleteStep,
    duplicateStepAction,
    reorderSteps,

    addDep,
    removeDep,
    updateDep,
    getValidParents,

    handleStart,
    handleDone,
    handleUndone,
    handleNow,
    clearStatus,

    displayTemp,
    getStepDuration,
    getFDT,
  }
}
