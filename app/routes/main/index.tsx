import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/main/')({
  component: MainHome,
})

function MainHome() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Home</h1>
      <div className="rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">Recipes</h2>
        <ul>
          <li>
            <Link
              to="/main/recipe/$id"
              params={{ id: '1' }}
              className="text-primary underline hover:opacity-80"
            >
              Pizza Margherita
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
