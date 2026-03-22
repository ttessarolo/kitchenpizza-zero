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
    <div className="bg-gradient-to-br from-[#d4a574] via-[#c4956a] to-[#b8845a] px-6 pt-8 pb-6 text-center">
      <div className="text-4xl mb-0.5">{typeIcon}</div>
      <input
        value={meta.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="text-[clamp(18px,5vw,26px)] font-bold text-white bg-transparent border-none outline-none text-center w-full font-display"
      />
      <div className="text-xs text-white/70 mt-0.5">
        di{' '}
        <input
          value={meta.author}
          onChange={(e) => onAuthorChange(e.target.value)}
          className="text-xs text-white/90 bg-transparent border-none border-b border-dashed border-white/40 outline-none text-center w-[140px]"
        />
      </div>
    </div>
  )
}
