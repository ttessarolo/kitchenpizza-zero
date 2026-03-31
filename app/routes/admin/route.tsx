import { Outlet, createFileRoute, isRedirect, redirect, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { Sparkles } from 'lucide-react'
import { isAdmin } from '~/lib/auth'
import { useT } from '~/hooks/useTranslation'

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
  const t = useT()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center gap-6">
        <Link to="/main" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; {t('admin_back_to_app')}
        </Link>
        <h1 className="text-lg font-bold text-foreground">{t('nav_admin')}</h1>
        <nav className="flex items-center gap-4 flex-1">
          <Link
            to="/admin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            activeOptions={{ exact: true }}
            activeProps={{ className: 'text-sm text-foreground font-medium' }}
          >
            {t('admin_dashboard_title')}
          </Link>
          <Link
            to="/admin/science"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: 'text-sm text-foreground font-medium' }}
          >
            {t('admin_section_science_nav')}
          </Link>
          <Link
            to="/admin/ai-brain"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: 'text-sm text-foreground font-medium' }}
          >
            <Sparkles className="w-3.5 h-3.5 inline-block mr-1 text-purple-500" />
            {t('admin.ai.title')}
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
