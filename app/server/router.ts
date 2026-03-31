import { os } from '@orpc/server'
import { healthCheck } from './procedures/health'
import { reconcile } from './procedures/graph'
import { blendFlours, calcYeast, calcTemp, getDefaults as getDoughDefaults, getWarnings as getDoughWarnings, calcDuration as calcDoughDuration, getCompositionPcts } from './procedures/dough'
import { getCatalog, getById, search, suggestByW, estimateWFromProtein, blendProperties, estimateBlendWProcedure } from './procedures/flour'
import { getMethods, calcDuration, maxHoursForW } from './procedures/rise'
import { calcTarget } from './procedures/portioning'
import { getDuration } from './procedures/schedule'
import { listBlocks, getBlock, updateBlock, listI18n, updateI18n } from './procedures/science-admin'
import { reconcileLayerProcedure } from './procedures/layer'
import { computePanoramica } from './procedures/panoramica'
import { getDefaultBakeConfig } from './procedures/bake'
import { autoCorrect } from './procedures/auto-correct'
import { explainWarning, nlToConstraints, checkCompat } from './procedures/llm'

export const appRouter = os.router({
  health: healthCheck,
  graph: os.router({
    reconcile,
    autoCorrect,
  }),
  dough: os.router({
    blendFlours,
    calcYeast,
    calcTemp,
    calcDuration: calcDoughDuration,
    getDefaults: getDoughDefaults,
    getWarnings: getDoughWarnings,
    getCompositionPcts,
  }),
  flour: os.router({
    getCatalog,
    getById,
    search,
    suggestByW,
    estimateW: estimateWFromProtein,
    blendProperties,
    estimateBlendW: estimateBlendWProcedure,
  }),
  bake: os.router({
    getDefaultConfig: getDefaultBakeConfig,
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
  llm: os.router({
    explainWarning,
    nlToConstraints,
    checkCompat,
  }),
})

export type AppRouter = typeof appRouter
