import { os } from '@orpc/server'
import { healthCheck } from './procedures/health'
import { reconcile } from './procedures/graph'
import { blendFlours, calcYeast, calcTemp, getDefaults as getDoughDefaults, getWarnings as getDoughWarnings } from './procedures/dough'
import { getCatalog, getById, search, suggestByW, estimateWFromProtein } from './procedures/flour'
import { getMethods, calcDuration, maxHoursForW } from './procedures/rise'
import { calcTarget } from './procedures/portioning'
import { getDuration } from './procedures/schedule'
import { listBlocks, getBlock, updateBlock, listI18n, updateI18n } from './procedures/science-admin'

export const appRouter = os.router({
  health: healthCheck,
  graph: os.router({
    reconcile,
  }),
  dough: os.router({
    blendFlours,
    calcYeast,
    calcTemp,
    getDefaults: getDoughDefaults,
    getWarnings: getDoughWarnings,
  }),
  flour: os.router({
    getCatalog,
    getById,
    search,
    suggestByW,
    estimateW: estimateWFromProtein,
  }),
  rise: os.router({
    getMethods,
    calcDuration,
    maxHoursForW,
  }),
  portioning: os.router({
    calcTarget,
  }),
  schedule: os.router({
    getDuration,
  }),
  science: os.router({
    listBlocks,
    getBlock,
    updateBlock,
    listI18n,
    updateI18n,
  }),
})

export type AppRouter = typeof appRouter
