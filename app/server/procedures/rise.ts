import { baseProcedure } from '../middleware/auth'
import {
  getMethodsOutputSchema,
  calcDurationInputSchema, calcDurationOutputSchema,
  maxHoursForWInputSchema, maxHoursForWOutputSchema,
} from '../schemas/rise'
import { calcRiseDuration, getAllRiseMethods, maxRiseHoursForW } from '@commons/utils/rise-manager'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

export const getMethods = baseProcedure
  .output(getMethodsOutputSchema)
  .handler(async () => ({
    methods: getAllRiseMethods(),
  }))

export const calcDuration = baseProcedure
  .input(calcDurationInputSchema)
  .output(calcDurationOutputSchema)
  .handler(async ({ input }) => {
    return {
      durationMin: calcRiseDuration(
        provider,
        {
          base: input.base,
          method_key: input.method,
          W: input.flourW,
          yeastPct: input.yeastPct,
          yeastSpeedFactor: input.yeastSpeedFactor,
          temperatureFactor: input.temperatureFactor,
          starchDamage: input.flourStarchDamage,
          fallingNumber: input.flourFallingNumber,
          fiber: input.flourFiber,
          saltPct: input.saltPct,
          sugarPct: input.sugarPct,
          fatPct: input.fatPct,
        },
      ),
    }
  })

export const maxHoursForW = baseProcedure
  .input(maxHoursForWInputSchema)
  .output(maxHoursForWOutputSchema)
  .handler(async ({ input }) => ({
    maxHours: maxRiseHoursForW(provider, input.W),
  }))
