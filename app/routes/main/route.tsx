import { Outlet, createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

const getAuthState = createServerFn().handler(async () => {
  const { userId } = await auth()
  return { userId }
})

export const Route = createFileRoute('/main')({
  beforeLoad: async () => {
    try {
      const { userId } = await getAuthState()
      if (!userId) {
        throw redirect({ to: '/sign-in/$', params: { _splat: '' } })
      }
    } catch (error) {
      if (isRedirect(error)) {
        throw error
      }
    }
  },
  component: MainLayout,
})

function MainLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  )
}
