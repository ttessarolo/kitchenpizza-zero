import { cn } from '~/lib/utils'

interface IngredientRowProps {
  name: string
  amount: number | string
  unit: string
  className?: string
}

export function IngredientRow({ name, amount, unit, className }: IngredientRowProps) {
  return (
    <div
      className={cn(
        'flex justify-between items-center py-0.5 border-b border-border',
        className,
      )}
    >
      <span className="text-xs text-foreground">{name}</span>
      <span className="text-xs font-semibold">
        {amount}{' '}
        <span className="text-[9px] font-normal text-muted-foreground">{unit}</span>
      </span>
    </div>
  )
}
