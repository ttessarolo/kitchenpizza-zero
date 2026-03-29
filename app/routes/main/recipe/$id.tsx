import { createFileRoute } from '@tanstack/react-router'
import { Recipe } from '~/components/recipe/Recipe'
import { getRecipeById, getRecipeByIdV3 } from '@/local_data'

export const Route = createFileRoute('/main/recipe/$id')({
  component: RecipePage,
})

function RecipePage() {
  const { id } = Route.useParams()

  // Try v3 (multi-layer) first, fall back to v1
  const v3 = getRecipeByIdV3(id)
  if (v3) {
    return <Recipe initialRecipe={v3} />
  }

  const recipe = getRecipeById(id)
  return <Recipe initialRecipe={recipe} />
}
