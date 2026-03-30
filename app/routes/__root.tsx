import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-react-start'
import { itIT } from '@clerk/localizations'
import appCss from '~/styles/globals.css?url'
import { useLocale, useSyncLocaleFromCookie } from '~/hooks/useTranslation'
import { useSyncThemeFromStorage, useTheme } from '~/hooks/useTheme'

const clerkLocales: Record<string, typeof itIT | undefined> = {
  it: itIT,
  en: undefined,
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'KitchenPizza' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  useSyncLocaleFromCookie() // Restore locale from cookie AFTER hydration (no SSR mismatch)
  useSyncThemeFromStorage() // Restore theme from localStorage AFTER hydration
  const locale = useLocale()
  const theme = useTheme()

  return (
    <RootDocument locale={locale} theme={theme}>
      <ClerkProvider
        localization={clerkLocales[locale]}
        signInFallbackRedirectUrl="/main"
        signUpFallbackRedirectUrl="/main"
      >
        <Outlet />
      </ClerkProvider>
    </RootDocument>
  )
}

function RootDocument({ children, locale, theme }: { children: React.ReactNode; locale: string; theme: string }) {
  return (
    <html lang={locale} className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <HeadContent />
        {/* FOUC prevention: set dark class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='light')return;document.documentElement.classList.add('dark')})()` }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
