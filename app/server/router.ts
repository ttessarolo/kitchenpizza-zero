import { os } from '@orpc/server'
import { healthCheck } from './procedures/health'
import { reconcile } from './procedures/graph'
import { blendFlours, calcYeast, calcTemp, getDefaults as getDoughDefaults, getWarnings as getDoughWarnings } from './procedures/dough'
import { getCatalog, getById, search, suggestByW, estimateWFromProtein } from './procedures/flour'
import { getMethods, calcDuration, maxHoursForW } from './procedures/rise'
import { calcTarget } from './procedures/portioning'
import { getDuration } from './procedures/schedule'
import { listBlocks, getBlock, updateBlock, listI18n, updateI18n } from './procedures/science-admin'
import { reconcileLayerProcedure } from './procedures/layer'
import { computePanoramica } from './procedures/panoramica'

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
  layer: os.router({
    reconcile: reconcileLayerProcedure,
  }),
  panoramica: os.router({
    compute: computePanoramica,
  }),
})

export type AppRouter = typeof appRouter
