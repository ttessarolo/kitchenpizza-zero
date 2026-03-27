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
  const locale = useLocale()

  return (
    <RootDocument locale={locale}>
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

function RootDocument({ children, locale }: { children: React.ReactNode; locale: string }) {
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
