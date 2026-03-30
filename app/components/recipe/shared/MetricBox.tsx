import { cn } from '~/lib/utils'

interface MetricBoxProps {
  label: string
  value: string
  color: string
  className?: string
}

export function MetricBox({ label, value, color, className }: MetricBoxProps) {
  return (
    <div
      className={cn(
        'py-1.5 px-2 bg-background rounded-md text-center',
        className,
      )}
    >
      <div className="text-[9px] text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className="text-sm font-bold font-display"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  )
}
