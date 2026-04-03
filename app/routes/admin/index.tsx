import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getScienceProvider } from '~/server/middleware/science'
import {
  FlaskConical,
  Languages,
  Activity,
  BarChart3,
  BookOpen,
  Shield,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useT } from '~/hooks/useTranslation'
import { getFlags } from '~/server/lib/feature-flags'
import { getCurrentProvider } from '~/server/services/llm/llm-service'

const loadAdminStats = createServerFn().handler(async () => {
  const provider = await getScienceProvider()
  const blocks = provider.listAll()
  const rules = blocks.filter((b) => b.type === 'rule')

  // Check LLM status
  const flags = getFlags()
  let llmStatus: 'ok' | 'error' = 'error'
  const llmModel = process.env.OPENAI_MODEL || 'gpt-5.4-mini'
  try {
    const llmProvider = getCurrentProvider()
    llmStatus = (await llmProvider.isAvailable()) ? 'ok' : 'error'
  } catch { /* ignore */ }

  return {
    scienceBlocks: blocks.length,
    scienceRules: rules.length,
    llmEnabled: flags.LLM_ENABLED,
    llmProvider: flags.LLM_PROVIDER,
    llmStatus,
    llmModel,
  }
})

export const Route = createFileRoute('/admin/')({
  loader: () => loadAdminStats(),
  component: AdminDashboard,
})

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function NavCard({
  icon: Icon,
  title,
  description,
  to,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  to: string
  color: string
}) {
  return (
    <Link
      to={to}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group flex items-start gap-4"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
          {title}
          <ChevronRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </Link>
  )
}

function AdminDashboard() {
  const t = useT()
  const stats = Route.useLoaderData()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('admin_dashboard_title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('admin_welcome')}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FlaskConical}
          label={t('admin_stats_blocks')}
          value={stats.scienceBlocks}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          icon={BookOpen}
          label={t('admin_stats_rules')}
          value={stats.scienceRules}
          color="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          icon={Languages}
          label={t('admin_section_i18n_nav')}
          value="2"
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          icon={Shield}
          label={t('admin_system_status')}
          value={t('admin_system_ok')}
          color="bg-emerald-500/10 text-emerald-500"
        />
      </div>

      {/* Quick navigation */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('admin_quick_nav')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NavCard
            icon={FlaskConical}
            title={t('admin_section_science_nav')}
            description={`${stats.scienceBlocks} ${t('admin_stats_blocks').toLowerCase()}, ${stats.scienceRules} ${t('admin_stats_rules').toLowerCase()}`}
            to="/admin/science"
            color="bg-purple-500/10 text-purple-500"
          />
          <NavCard
            icon={Languages}
            title={t('admin_section_i18n_nav')}
            description="IT, EN"
            to="/admin/science/i18n"
            color="bg-blue-500/10 text-blue-500"
          />
          <NavCard
            icon={BarChart3}
            title={t('admin_stats_recipes')}
            description={t('layer_type_coming_soon')}
            to="/admin"
            color="bg-orange-500/10 text-orange-500"
          />
          <NavCard
            icon={Activity}
            title={t('admin_stats_users')}
            description={t('layer_type_coming_soon')}
            to="/admin"
            color="bg-teal-500/10 text-teal-500"
          />
        </div>
      </div>

      {/* AI Brain status card */}
      <div className={`border rounded-xl p-5 flex items-start gap-4 ${stats.llmEnabled ? 'bg-purple-500/5 border-purple-500/20' : 'bg-muted/50 border-border'}`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stats.llmEnabled ? 'bg-purple-500/15 text-purple-500' : 'bg-muted text-muted-foreground'}`}>
          <Sparkles className="size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{t('admin.ai.title')}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${stats.llmEnabled ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              {stats.llmEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.llmEnabled
              ? `Provider: ${stats.llmProvider} · Model: ${stats.llmModel} · Status: ${stats.llmStatus === 'ok' ? 'Connected' : 'Disconnected'}`
              : 'LLM_ENABLED=false — Brain 3 disabled. Set LLM_ENABLED=true in .env to activate.'
            }
          </div>
        </div>
      </div>

      {/* System status */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {t('admin_system_status')}
        </h3>
        <div className="space-y-3">
          <StatusRow label="Science Engine" status="ok" />
          <StatusRow label="i18n (IT/EN)" status="ok" />
          <StatusRow label="Auth (Clerk)" status="ok" />
          <StatusRow label="Database (Neon)" status="ok" />
          <StatusRow label={`OpenAI (${stats.llmModel})`} status={stats.llmStatus} />
          <StatusRow label="AI Brain (LLM)" status={stats.llmEnabled ? (stats.llmStatus === 'ok' ? 'ok' : 'warning') : 'warning'} />
        </div>
      </div>
    </div>
  )
}

function StatusRow({ label, status }: { label: string; status: 'ok' | 'warning' | 'error' }) {
  const colors = {
    ok: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
        <span className="text-xs text-muted-foreground capitalize">{status === 'ok' ? 'Operational' : status}</span>
      </div>
    </div>
  )
}
