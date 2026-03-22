import { createStart } from '@tanstack/react-start'
import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import {
  sentryGlobalRequestMiddleware,
  sentryGlobalFunctionMiddleware,
} from '@sentry/tanstackstart-react'

export const startInstance = createStart(() => ({
  requestMiddleware: [sentryGlobalRequestMiddleware, clerkMiddleware()],
  functionMiddleware: [sentryGlobalFunctionMiddleware],
}))
