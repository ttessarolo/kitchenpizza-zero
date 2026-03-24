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
        <ul className="space-y-2">
          <li>
            <Link
              to="/main/recipe/$id"
              params={{ id: '1' }}
              className="text-primary underline hover:opacity-80"
            >
              Shokupan 食パン
            </Link>
          </li>
          <li>
            <Link
              to="/main/recipe/$id"
              params={{ id: '2' }}
              className="text-primary underline hover:opacity-80"
            >
              Pane Casareccio con Biga
            </Link>
          </li>
          <li>
            <Link
              to="/main/recipe/$id"
              params={{ id: '3' }}
              className="text-primary underline hover:opacity-80"
            >
              Pizza Bianca in Teglia alla Romana
            </Link>
          </li>
          <li>
            <Link
              to="/main/recipe/$id"
              params={{ id: '4' }}
              className="text-primary underline hover:opacity-80"
            >
              Treccia Bicolore Pomodoro e Basilico
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
