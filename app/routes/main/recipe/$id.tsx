import { createFileRoute } from '@tanstack/react-router'
import { Recipe } from '~/components/recipe/Recipe'
import { getRecipeById } from '@/local_data'

export const Route = createFileRoute('/main/recipe/$id')({
  component: RecipePage,
})

function RecipePage() {
  const { id } = Route.useParams()
  const recipe = getRecipeById(id)

  return <Recipe initialRecipe={recipe} />
}
