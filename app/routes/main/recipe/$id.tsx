import { createFileRoute } from '@tanstack/react-router'
import { Recipe } from '~/components/recipe/Recipe'
import { DEFAULT_RECIPE } from '@/local_data'

export const Route = createFileRoute('/main/recipe/$id')({
  component: RecipePage,
})

function RecipePage() {
  const { id } = Route.useParams()

  // For now, id='1' loads the default Shokupan recipe
  const recipe = id === '1' ? DEFAULT_RECIPE : DEFAULT_RECIPE

  return <Recipe initialRecipe={recipe} />
}
