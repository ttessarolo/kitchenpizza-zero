import { useState } from 'react'
import { Card } from '~/components/ui/card'
import { celsiusToFahrenheit, fahrenheitToCelsius } from '@commons/utils/recipe'
import { STEP_TYPES } from '@/local_data'
import { useRecipe } from './RecipeContext'
import { StepCard } from './StepCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ScheduledStep } from '@commons/types/recipe'

// ── Sortable wrapper for StepCard ────────────────────────────────
function SortableStepCard({
  step,
  isOpen,
  isDone,
  isCurrent,
  onToggle,
  onDone,
  onUndone,
  disabled,
}: {
  step: ScheduledStep
  isOpen: boolean
  isDone: boolean
  isCurrent: boolean
  onToggle: () => void
  onDone: () => void
  onUndone: () => void
  disabled: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <StepCard
        step={step}
        isOpen={isOpen}
        isDone={isDone}
        isCurrent={isCurrent}
        onToggle={onToggle}
        onDone={onDone}
        onUndone={onUndone}
        dragHandleProps={disabled ? undefined : { ...attributes, ...listeners }}
      />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────
export function StepsList() {
  const {
    schedule,
    openSteps,
    toggleStep,
    doneMap,
    nextUndoneStep,
    started,
    temperatureUnit: tu,
    ambientTemp: at,
    setAmbientTemp,
    setTemperatureUnit,
    handleStart,
    handleDone,
    handleUndone,
    clearStatus,
    editMode,
    setEditMode,
    addStep,
    reorderSteps,
    recipe,
  } = useRecipe()

  const [addStepOpen, setAddStepOpen] = useState(false)
  const [newStepType, setNewStepType] = useState('dough')

  // Insert before the "done" step (nothing can come after "done")
  const doneIdx = recipe.steps.findIndex((s) => s.type === 'done')
  const insertAfterId = doneIdx > 0 ? recipe.steps[doneIdx - 1].id : (recipe.steps.length > 0 ? recipe.steps[recipe.steps.length - 1].id : null)

  // DnD sensors — pointer with distance activation + touch with delay
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)

  const stepIds = schedule.map((s) => s.id)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = stepIds.indexOf(active.id as string)
    const newIndex = stepIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    reorderSteps(oldIndex, newIndex)
  }

  return (
    <section className="mt-3.5">
      {/* Ambient temp + start/edit buttons */}
      <Card className="p-3 mb-2 border-2 border-green-500">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">🌡️</span>
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">Temperatura Ambiente</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={tu === 'F' ? celsiusToFahrenheit(at) : at}
                  step={0.1}
                  onChange={(e) =>
                    setAmbientTemp(tu === 'F' ? fahrenheitToCelsius(+e.target.value) : +e.target.value)
                  }
                  className="w-[44px] text-xs font-bold bg-background border-[1.5px] border-border rounded-[5px] px-1 py-0.5 outline-none text-center min-h-8"
                />
                <span className="text-xs text-muted-foreground">
                  {tu === 'F' ? '°F' : '°C'}
                </span>
                <button
                  type="button"
                  onClick={() => setTemperatureUnit(tu === 'C' ? 'F' : 'C')}
                  className="text-xs text-[#a08060] bg-transparent border border-border rounded px-1 py-px cursor-pointer"
                >
                  {tu === 'C' ? '°F' : '°C'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!started && (
              <button
                type="button"
                onClick={() => setEditMode(!editMode)}
                className={`text-xs border-none rounded-lg px-2.5 py-1.5 cursor-pointer min-h-9 ${
                  editMode
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'bg-[#e8e2da] text-[#8a7a66]'
                }`}
              >
                {editMode ? 'Modifica' : 'Visualizza'}
              </button>
            )}
            <button
              type="button"
              onClick={started ? clearStatus : handleStart}
              className={`text-xs font-bold border-none rounded-lg px-3 py-1.5 cursor-pointer min-h-9 ${
                started
                  ? 'bg-green-100 text-green-700'
                  : 'bg-green-600 text-white'
              }`}
            >
              {started ? '⟳ Riparti' : '🚀 Inizia!'}
            </button>
          </div>
        </div>
      </Card>

      {/* Steps timeline with drag & drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {schedule.map((s) => (
              <SortableStepCard
                key={s.id}
                step={s}
                isOpen={openSteps.has(s.id)}
                isDone={!!doneMap[s.id]}
                isCurrent={s.id === nextUndoneStep}
                onToggle={() => toggleStep(s.id)}
                onDone={() => handleDone(s.id)}
                onUndone={() => handleUndone(s.id)}
                disabled={!editMode || s.type === 'done'}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add step button */}
      {editMode && insertAfterId && (
        <button
          type="button"
          onClick={() => setAddStepOpen(true)}
          className="w-full mt-2 text-xs font-semibold text-primary bg-transparent border-2 border-dashed border-primary rounded-xl px-3 py-2.5 cursor-pointer min-h-11"
        >
          + Aggiungi Step
        </button>
      )}

      {/* Add step dialog */}
      <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Step</DialogTitle>
            <DialogDescription>
              Seleziona il tipo di step da aggiungere.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-1.5 my-2">
            {STEP_TYPES.filter((t) => t.key !== 'done').map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setNewStepType(t.key)}
                className={`px-2.5 py-2 text-xs rounded-lg border cursor-pointer text-left ${
                  newStepType === t.key
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'border-border bg-white'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAddStepOpen(false)}
              className="px-3 py-1.5 text-xs border border-border rounded-md bg-white cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => {
                if (insertAfterId) {
                  addStep(insertAfterId, newStepType)
                }
                setAddStepOpen(false)
              }}
              className="px-3 py-1.5 text-xs border-none rounded-md bg-primary text-primary-foreground cursor-pointer font-semibold"
            >
              Aggiungi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
