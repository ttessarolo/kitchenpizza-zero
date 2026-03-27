import { createFileRoute, Link } from '@tanstack/react-router'
import { RECIPE_LIST } from '@/local_data'

export const Route = createFileRoute('/main/')({
  component: MainHome,
})

function MainHome() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Home</h1>
      <div className="rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">Recipes</h2>
        <ul className="space-y-2">
          {RECIPE_LIST.map((r) => (
            <li key={r.id}>
              <Link
                to="/main/recipe/$id"
                params={{ id: r.id }}
                className="text-primary underline hover:opacity-80"
              >
                {r.name}
              </Link>
              {r.description && (
                <span className="text-xs text-muted-foreground ml-2">{r.description}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
