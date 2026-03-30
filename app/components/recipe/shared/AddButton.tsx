import { cn } from '~/lib/utils'

interface AddButtonProps {
  label: string
  onClick: () => void
  className?: string
}

export function AddButton({ label, onClick, className }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[9px] font-semibold text-primary bg-transparent border border-dashed border-primary',
        'rounded-[5px] px-2 py-1 cursor-pointer min-h-7',
        className,
      )}
    >
      {label}
    </button>
  )
}
