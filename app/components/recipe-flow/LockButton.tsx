import { Lock, Unlock } from 'lucide-react'
import { cn } from '~/lib/utils'

export function LockButton({ locked, onToggle, disabled }: {
  locked: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'p-0.5 rounded transition-colors',
        locked
          ? 'text-primary'
          : 'text-muted-foreground/40 hover:text-muted-foreground',
        disabled && 'opacity-30 cursor-not-allowed',
      )}
      title={locked ? 'Unlock' : 'Lock'}
    >
      {locked ? <Lock size={12} /> : <Unlock size={12} />}
    </button>
  )
}
