import { Card } from '~/components/ui/card'
import { pad, fmtTime, relativeDate } from '@commons/utils/format'
import type { PlanningMode } from '@commons/types/recipe'

const DAY_LABELS = ['Oggi', 'Domani', 'Dopodomani', 'Tra 3gg']

interface ScheduleEditorProps {
  planningMode: PlanningMode
  forwardHour: number
  forwardMinute: number
  backwardDay: number
  backwardHour: number
  backwardMinute: number
  startTime: Date
  endTime: Date | null
  onPlanningModeChange: (m: PlanningMode) => void
  onForwardHourChange: (h: number) => void
  onForwardMinuteChange: (m: number) => void
  onBackwardDayChange: (d: number) => void
  onBackwardHourChange: (h: number) => void
  onBackwardMinuteChange: (m: number) => void
  onNow: () => void
}

export function ScheduleEditor({
  planningMode,
  forwardHour,
  forwardMinute,
  backwardDay,
  backwardHour,
  backwardMinute,
  startTime,
  endTime,
  onPlanningModeChange,
  onForwardHourChange,
  onForwardMinuteChange,
  onBackwardDayChange,
  onBackwardHourChange,
  onBackwardMinuteChange,
  onNow,
}: ScheduleEditorProps) {
  return (
    <Card className="p-3 mt-1.5">
      {/* Mode toggle */}
      <div className="flex rounded-[7px] overflow-hidden border-[1.5px] border-border mb-2">
        {([
          { k: 'forward' as const, l: "Dall'inizio" },
          { k: 'backward' as const, l: 'Dalla fine' },
        ]).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => onPlanningModeChange(t.k)}
            className={`flex-1 py-1.5 border-none cursor-pointer text-xs min-h-11 ${
              planningMode === t.k
                ? 'bg-primary text-primary-foreground font-bold'
                : 'bg-card text-muted-foreground font-normal'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {planningMode === 'forward' ? (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Inizio</span>
            <select
              value={forwardHour}
              onChange={(e) => onForwardHourChange(+e.target.value)}
              className="text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 px-2 cursor-pointer outline-none appearance-none w-[44px] text-center min-h-11"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {pad(i)}
                </option>
              ))}
            </select>
            <b>:</b>
            <select
              value={forwardMinute}
              onChange={(e) => onForwardMinuteChange(+e.target.value)}
              className="text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 px-2 cursor-pointer outline-none appearance-none w-[44px] text-center min-h-11"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i * 5}>
                  {pad(i * 5)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onNow}
              className="text-xs font-semibold bg-muted border border-border rounded-[5px] px-2 py-1 cursor-pointer text-muted-foreground min-h-7"
            >
              Adesso
            </button>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            Fine:{' '}
            <b className="text-lg font-display text-foreground">
              {endTime ? fmtTime(endTime) : '--:--'}
            </b>{' '}
            {endTime && <span>({relativeDate(endTime)})</span>}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Pronto</span>
            <select
              value={backwardDay}
              onChange={(e) => onBackwardDayChange(+e.target.value)}
              className="text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 px-2 cursor-pointer outline-none appearance-none w-auto min-h-11"
            >
              {DAY_LABELS.map((l, i) => (
                <option key={i} value={i}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={backwardHour}
              onChange={(e) => onBackwardHourChange(+e.target.value)}
              className="text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 px-2 cursor-pointer outline-none appearance-none w-[44px] text-center min-h-11"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {pad(i)}
                </option>
              ))}
            </select>
            <b>:</b>
            <select
              value={backwardMinute}
              onChange={(e) => onBackwardMinuteChange(+e.target.value)}
              className="text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 px-2 cursor-pointer outline-none appearance-none w-[44px] text-center min-h-11"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i * 5}>
                  {pad(i * 5)}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            Inizia:{' '}
            <b className="text-lg font-display text-foreground">
              {fmtTime(startTime)}
            </b>{' '}
            ({relativeDate(startTime)})
          </div>
        </div>
      )}
    </Card>
  )
}
