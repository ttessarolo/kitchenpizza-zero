import { useState } from 'react'
import { fmtTime, fmtDuration } from '@commons/utils/recipe'
import { STEP_TYPES, COLOR_MAP } from '@/local_data'
import type { ScheduledStep } from '@commons/types/recipe'
import { StepBody } from './StepBody'
import { useRecipe } from './RecipeContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

interface StepCardProps {
  step: ScheduledStep
  isOpen: boolean
  onToggle: () => void
  dragHandleProps?: Record<string, unknown>
}

export function StepCard({
  step: s,
  isOpen,
  onToggle,
  dragHandleProps,
}: StepCardProps) {
  const { deleteStep, duplicateStepAction } = useRecipe()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const cm = COLOR_MAP[s.type] || COLOR_MAP.dough

  // Done step card for "done" type
  if (s.type === 'done') {
    return (
      <div className="rounded-xl p-3 text-center bg-white border border-primary/10">
        <div className="text-[26px]">{'🎉'}</div>
        <div className="text-sm font-bold">Fine</div>
        <div className="text-xl font-bold font-display mt-0.5">{fmtTime(s.start)}</div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`rounded-[11px] overflow-hidden bg-white ${
          isOpen
            ? 'border-[1.5px] border-primary'
            : 'border border-primary/10'
        }`}
      >
        {/* Header row */}
        <div className="px-2.5 py-2 flex items-center gap-1.5">
          {/* Drag handle */}
          {dragHandleProps && (
            <span
              {...dragHandleProps}
              className="text-[#b8a08a] cursor-grab active:cursor-grabbing shrink-0 touch-none select-none"
            >
              ⠿
            </span>
          )}
          {/* Time badge */}
          <div
            className="min-w-[44px] px-1.5 py-0.5 rounded-md text-center shrink-0"
            style={{ background: cm.bg }}
          >
            <div
              className="text-sm font-bold"
              style={{ color: cm.tx }}
            >
              {fmtTime(s.start)}
            </div>
          </div>

          {/* Title */}
          <div onClick={onToggle} className="flex-1 cursor-pointer">
            <div className="text-sm font-semibold text-foreground">
              {STEP_TYPES.find((t) => t.key === s.type)?.icon} {s.title}
            </div>
            <div className="text-xs text-[#b8a08a] mt-px">
              {cm.lb}{s.subtype ? ` · ${STEP_TYPES.find((t) => t.key === s.type)?.subtypes?.find((st) => st.key === s.subtype)?.label || s.subtype}` : ''} · {fmtDuration(s.dur)}
            </div>
          </div>

          {/* CRUD buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => duplicateStepAction(s.id)}
              className="w-7 h-7 rounded-md border-none bg-[#f0e8df] text-[#8a7a66] text-xs cursor-pointer flex items-center justify-center"
              title="Duplica"
            >
              ⧉
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="w-7 h-7 rounded-md border-none bg-[#fde8e8] text-[#c45a3a] text-xs cursor-pointer flex items-center justify-center"
              title="Elimina"
            >
              ✕
            </button>
          </div>

          {/* Chevron */}
          <span
            onClick={onToggle}
            className={`text-xs text-[#b8a08a] cursor-pointer shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          >
            {'▾'}
          </span>
        </div>

        {/* Expanded body */}
        {isOpen && <StepBody step={s} />}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare step?</DialogTitle>
            <DialogDescription>
              Vuoi eliminare "{s.title}"? I passi successivi verranno ricollegati ai predecessori.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="px-3 py-1.5 text-xs border border-border rounded-md bg-white cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => {
                deleteStep(s.id)
                setDeleteOpen(false)
              }}
              className="px-3 py-1.5 text-xs border-none rounded-md bg-[#c45a3a] text-white cursor-pointer font-semibold"
            >
              Elimina
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
