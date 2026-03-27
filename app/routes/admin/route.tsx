import { Outlet, createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { isAdmin } from '~/lib/auth'

const getAdminAuth = createServerFn().handler(async () => {
  const { userId, sessionClaims } = await auth()
  return { userId, isAdmin: isAdmin(sessionClaims as Record<string, unknown> | undefined) }
})

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    try {
      const { userId, isAdmin } = await getAdminAuth()
      if (!userId) throw redirect({ to: '/sign-in/$', params: { _splat: '' } })
      if (!isAdmin) throw redirect({ to: '/main' })
    } catch (error) {
      if (isRedirect(error)) throw error
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-3 flex items-center gap-4">
        <a href="/main" className="text-sm text-muted-foreground hover:text-foreground">&larr; App</a>
        <h1 className="text-lg font-bold">Admin</h1>
        <a href="/admin/science" className="text-sm text-primary font-medium">Science</a>
      </header>
      <Outlet />
    </div>
  )
}
