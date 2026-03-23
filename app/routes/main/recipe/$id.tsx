import { createFileRoute } from '@tanstack/react-router'
import { Recipe } from '~/components/recipe/Recipe'
import { DEFAULT_RECIPE, RECIPE_2, RECIPE_3 } from '@/local_data'

const RECIPES: Record<string, typeof DEFAULT_RECIPE> = {
  '1': DEFAULT_RECIPE,
  '2': RECIPE_2,
  '3': RECIPE_3,
}

export const Route = createFileRoute('/main/recipe/$id')({
  component: RecipePage,
})

function RecipePage() {
  const { id } = Route.useParams()
  const recipe = RECIPES[id] || DEFAULT_RECIPE

  return <Recipe initialRecipe={recipe} />
}
