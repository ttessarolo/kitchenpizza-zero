import * as Sentry from '@sentry/tanstackstart-react'

Sentry.init({
  dsn: 'https://fa0063163a32e2de4cdddfdfc035528c@o4510834833227776.ingest.de.sentry.io/4511089041014864',
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  environment: process.env.NODE_ENV ?? 'development',

  beforeSend(event) {
    const status = event.contexts?.response?.status_code
    if (status && [400, 401, 403, 404, 409].includes(status)) {
      return null
    }
    return event
  },
})
