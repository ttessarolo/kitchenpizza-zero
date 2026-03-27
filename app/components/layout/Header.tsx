import { Link } from '@tanstack/react-router'

const LOCALES = [
  { key: 'it', label: 'IT' },
  { key: 'en', label: 'EN' },
]

function getCurrentLocale(): string {
  if (typeof document === 'undefined') return 'it'
  const match = document.cookie.match(/PARAGLIDE_LOCALE=(\w+)/)
  return match?.[1] ?? 'it'
}

function setLocale(locale: string) {
  document.cookie = `PARAGLIDE_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`
  window.location.reload()
}

export function Header() {
  const currentLocale = getCurrentLocale()

  return (
    <header className="border-b bg-background px-4 py-2.5 flex items-center gap-4">
      <Link to="/main" className="text-lg font-bold text-foreground hover:opacity-80">
        KitchenPizza
      </Link>

      <nav className="flex items-center gap-3 flex-1">
        <Link
          to="/main"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          activeProps={{ className: 'text-sm text-foreground font-medium' }}
        >
          Home
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
              currentLocale === l.key
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
