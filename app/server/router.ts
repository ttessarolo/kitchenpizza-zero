import { os } from '@orpc/server'
import { healthCheck } from './procedures/health'

export const appRouter = os.router({
  health: healthCheck,
})

export type AppRouter = typeof appRouter
