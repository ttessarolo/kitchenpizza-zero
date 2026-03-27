import { Link } from '@tanstack/react-router'
import { useLocale, useSetLocale, useT, type SupportedLocale } from '~/hooks/useTranslation'

const LOCALES: { key: SupportedLocale; label: string }[] = [
  { key: 'it', label: 'IT' },
  { key: 'en', label: 'EN' },
]

export function Header() {
  const locale = useLocale()
  const setLocale = useSetLocale()
  const t = useT()

  return (
    <header className="border-b bg-background px-4 py-2.5 flex items-center gap-4">
      <Link to="/main" className="text-lg font-bold text-foreground hover:opacity-80">
        {t('app_title')}
      </Link>

      <nav className="flex items-center gap-3 flex-1">
        <Link
          to="/main"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          activeProps={{ className: 'text-sm text-foreground font-medium' }}
        >
          {t('nav_home')}
        </Link>
      </nav>

      {/* Language switcher */}
      <div className="flex items-center gap-1">
        {LOCALES.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setLocale(l.key)}
            className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
              locale === l.key
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </header>
  )
}
