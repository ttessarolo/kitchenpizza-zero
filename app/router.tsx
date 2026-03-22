import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import * as Sentry from '@sentry/tanstackstart-react'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  })

  if (!router.isServer) {
    Sentry.init({
      dsn: 'https://fa0063163a32e2de4cdddfdfc035528c@o4510834833227776.ingest.de.sentry.io/4511089041014864',
      integrations: [
        Sentry.tanstackRouterBrowserTracingIntegration(router),
      ],
      tracesSampleRate: 1.0,
      sendDefaultPii: true,
      environment: import.meta.env.MODE,
    })
  }

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
