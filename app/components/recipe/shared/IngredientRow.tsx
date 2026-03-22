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
        'flex justify-between items-center py-0.5 border-b border-[#f0e8df]',
        className,
      )}
    >
      <span className="text-xs text-[#4a3628]">{name}</span>
      <span className="text-xs font-semibold">
        {amount}{' '}
        <span className="text-[11px] font-normal text-[#a08060]">{unit}</span>
      </span>
    </div>
  )
}
