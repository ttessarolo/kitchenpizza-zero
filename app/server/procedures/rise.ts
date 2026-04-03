import { baseProcedure } from '../middleware/auth'
import {
  getMethodsOutputSchema,
  calcDurationInputSchema, calcDurationOutputSchema,
  maxHoursForWInputSchema, maxHoursForWOutputSchema,
} from '../schemas/rise'
import { calcRiseDuration, getAllRiseMethods, maxRiseHoursForW } from '@commons/utils/rise-manager'
import { getScienceProvider } from '../middleware/science'

export const getMethods = baseProcedure
  .output(getMethodsOutputSchema)
  .handler(async () => {
    const provider = await getScienceProvider()
    return { methods: getAllRiseMethods(provider) }
  })

export const calcDuration = baseProcedure
  .input(calcDurationInputSchema)
  .output(calcDurationOutputSchema)
  .handler(async ({ input }) => {
    const provider = await getScienceProvider()
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
  .handler(async ({ input }) => {
    const provider = await getScienceProvider()
    return { maxHours: maxRiseHoursForW(provider, input.W) }
  })
