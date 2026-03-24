import type { RecipeStep } from '@commons/types/recipe'
import { fmtDuration, getStepTotalWeight, rnd } from '@commons/utils/recipe'
import { STEP_TYPES } from '@/local_data'
import { Slider } from '~/components/ui/slider'
import { useRecipe } from './RecipeContext'

interface DepEditorProps {
  step: RecipeStep
}

export function DepEditor({ step: s }: DepEditorProps) {
  const {
    recipe,
    editMode,
    addDep,
    removeDep,
    updateDep,
    getValidParents,
    getStepDuration,
  } = useRecipe()
  const { steps } = recipe

  const validParents = getValidParents(s.id)
  const availableParents = validParents.filter(
    (p) => !s.deps.some((d) => d.id === p.id),
  )

  return (
    <div className="mt-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-1">
        Aspetta fino a quando hai: ({s.deps.length})
      </div>

      {s.deps.length === 0 && (
        <div className="text-xs text-muted-foreground italic">Nessuna condizione di attesa</div>
      )}

      {s.deps.map((dep) => {
        const parent = steps.find((x) => x.id === dep.id)
        if (!parent) return null
        const parentIcon = STEP_TYPES.find((t) => t.key === parent.type)?.icon || ''
        const parentDur = getStepDuration(parent)
        const parentWeight = getStepTotalWeight(parent)

        return (
          <div
            key={dep.id}
            className="mb-2 p-2 bg-[#f9f5f0] rounded-lg border border-[#e8e0d5]"
          >
            {/* Parent title + remove */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#4a3628]">
                {parentIcon} {parent.title}
              </span>
              {editMode && (
                <button
                  type="button"
                  onClick={() => removeDep(s.id, dep.id)}
                  className="w-5 h-5 rounded-full border-none bg-[#e8e2da] text-[#8a7a66] text-xs font-bold cursor-pointer flex items-center justify-center p-0"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Time slider */}
            <div className="mb-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-0.5">
                <span>⏱ Tempo completato</span>
                <span>
                  <b>{Math.round(dep.wait * 100)}%</b>
                  {' · '}
                  {fmtDuration(Math.round(parentDur * dep.wait))} su {fmtDuration(parentDur)}
                </span>
              </div>
              <Slider
                value={[dep.wait * 100]}
                min={0}
                max={100}
                step={5}
                disabled={!editMode}
                onValueChange={([v]) => updateDep(s.id, dep.id, 'wait', v / 100)}
                className="w-full"
              />
            </div>

            {/* Grams slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-0.5">
                <span>📦 Quantità prodotta</span>
                <span>
                  <b>{Math.round(dep.grams * 100)}%</b>
                  {parentWeight > 0 && (
                    <>
                      {' · '}
                      {rnd(parentWeight * dep.grams)}g su {rnd(parentWeight)}g
                    </>
                  )}
                </span>
              </div>
              <Slider
                value={[dep.grams * 100]}
                min={0}
                max={100}
                step={5}
                disabled={!editMode}
                onValueChange={([v]) => updateDep(s.id, dep.id, 'grams', v / 100)}
                className="w-full"
              />
            </div>
          </div>
        )
      })}

      {/* Add dependency button */}
      {editMode && availableParents.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addDep(s.id, e.target.value)
          }}
          className="w-full text-xs font-semibold text-primary bg-transparent border border-dashed border-primary rounded-[5px] px-2 py-1.5 cursor-pointer outline-none min-h-8 mt-1"
        >
          <option value="">+ Aggiungi condizione di attesa</option>
          {availableParents.map((p) => (
            <option key={p.id} value={p.id}>
              {STEP_TYPES.find((t) => t.key === p.type)?.icon} {p.title}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
