import { os } from '@orpc/server'
import { healthCheck } from './procedures/health'
import { reconcile } from './procedures/graph'

export const appRouter = os.router({
  health: healthCheck,
  graph: os.router({
    reconcile,
  }),
})

export type AppRouter = typeof appRouter
