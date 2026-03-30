import { useEffect } from 'react'
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
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
})

/** Paint active-track gradient on all range inputs (WebKit has no ::-webkit-slider-progress).
 *  Deferred with double-rAF to avoid hydration mismatch — DOM mutations happen after React reconciles. */
function useRangeSliderGradients() {
  useEffect(() => {
    function paint(el: HTMLInputElement) {
      const mn = +el.min || 0
      const mx = +el.max || 100
      const pct = ((+el.value - mn) / (mx - mn)) * 100
      el.style.background = `linear-gradient(to right, hsl(var(--accent)) ${pct}%, hsl(var(--muted)) ${pct}%)`
    }
    function onInput(e: Event) {
      const t = e.target as HTMLElement
      if (t instanceof HTMLInputElement && t.type === 'range') paint(t)
    }
    function paintAll() {
      document.querySelectorAll<HTMLInputElement>('input[type=range]').forEach(paint)
    }

    // Double-rAF ensures React hydration is fully committed before we touch DOM
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.addEventListener('input', onInput)
      const obs = new MutationObserver(paintAll)
      obs.observe(document.body, { childList: true, subtree: true })
      paintAll()

      // Store cleanup refs on window for the effect cleanup
      ;(window as unknown as Record<string, unknown>).__rangeCleanup = () => {
        document.removeEventListener('input', onInput)
        obs.disconnect()
      }
    }))

    return () => {
      const cleanup = (window as unknown as Record<string, unknown>).__rangeCleanup as (() => void) | undefined
      cleanup?.()
    }
  }, [])
}

function RootComponent() {
  useSyncLocaleFromCookie() // Restore locale from cookie AFTER hydration (no SSR mismatch)
  useSyncThemeFromStorage() // Restore theme from localStorage AFTER hydration
  useRangeSliderGradients() // Paint active-track gradient after hydration
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
