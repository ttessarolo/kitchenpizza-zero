import { createContext, useContext } from 'react'
import type { RecipeCalculator } from '~/hooks/useRecipeCalculator'

const RecipeContext = createContext<RecipeCalculator | null>(null)

export function RecipeProvider({ children, calc }: { children: React.ReactNode; calc: RecipeCalculator }) {
  return <RecipeContext.Provider value={calc}>{children}</RecipeContext.Provider>
}

export function useRecipe(): RecipeCalculator {
  const ctx = useContext(RecipeContext)
  if (!ctx) throw new Error('useRecipe must be used within RecipeProvider')
  return ctx
}
