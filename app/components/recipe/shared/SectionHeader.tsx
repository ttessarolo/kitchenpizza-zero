import { cn } from '~/lib/utils'

interface SectionHeaderProps {
  emoji: string
  title: string
  className?: string
}

export function SectionHeader({ emoji, title, className }: SectionHeaderProps) {
  return (
    <h2
      className={cn(
        'flex items-center gap-1.5 text-base font-semibold mb-1.5 ml-0.5',
        className,
      )}
    >
      <span>{emoji}</span> {title}
    </h2>
  )
}
