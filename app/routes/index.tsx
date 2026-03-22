import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">KitchenPizza</h1>
      <div className="flex gap-4">
        <Link
          to="/sign-in/$"
          params={{ _splat: '' }}
          className="rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          Login
        </Link>
        <Link
          to="/sign-up/$"
          params={{ _splat: '' }}
          className="rounded-lg border border-border bg-background px-6 py-3 text-foreground font-medium hover:bg-accent transition-colors"
        >
          Registrati
        </Link>
      </div>
    </div>
  )
}
