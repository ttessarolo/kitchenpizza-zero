import { createFileRoute } from '@tanstack/react-router'
import { Recipe } from '~/components/recipe/Recipe'
import { RECIPE_0, DEFAULT_RECIPE, RECIPE_2, RECIPE_3, RECIPE_4, RECIPE_5 } from '@/local_data'

const RECIPES: Record<string, typeof DEFAULT_RECIPE> = {
  '0': RECIPE_0,
  '1': DEFAULT_RECIPE,
  '2': RECIPE_2,
  '3': RECIPE_3,
  '4': RECIPE_4,
  '5': RECIPE_5,
}

export const Route = createFileRoute('/main/recipe/$id')({
  component: RecipePage,
})

function RecipePage() {
  const { id } = Route.useParams()
  const recipe = RECIPES[id] || DEFAULT_RECIPE

  return <Recipe initialRecipe={recipe} />
}
