import { RECIPE_TYPES } from '@/local_data'
import type { RecipeMeta } from '@commons/types/recipe'

interface RecipeHeaderProps {
  meta: RecipeMeta
  onNameChange: (name: string) => void
  onAuthorChange: (author: string) => void
}

export function RecipeHeader({ meta, onNameChange, onAuthorChange }: RecipeHeaderProps) {
  const typeIcon = RECIPE_TYPES.find((t) => t.key === meta.type)?.icon || '🍞'

  return (
    <div className="bg-primary px-4 py-2.5 flex items-center gap-3">
      <span className="text-lg leading-none">{typeIcon}</span>
      <input
        value={meta.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="text-sm font-bold text-primary-foreground bg-transparent border-none outline-none font-display min-w-0 flex-1"
      />
      <div className="text-xs text-primary-foreground/70 flex items-center gap-1 shrink-0">
        <span>di</span>
        <input
          value={meta.author}
          onChange={(e) => onAuthorChange(e.target.value)}
          className="text-xs text-primary-foreground/90 bg-transparent border-none border-b border-dashed border-primary-foreground/40 outline-none w-[100px]"
        />
      </div>
    </div>
  )
}
