import { baseProcedure } from '../middleware/auth'
import {
  getMethodsOutputSchema,
  calcDurationInputSchema, calcDurationOutputSchema,
  maxHoursForWInputSchema, maxHoursForWOutputSchema,
} from '../schemas/rise'
import { calcRiseDuration, getAllRiseMethods, maxRiseHoursForW } from '@commons/utils/rise-manager'
import type { BlendedFlourProps } from '@commons/types/recipe'

export const getMethods = baseProcedure
  .output(getMethodsOutputSchema)
  .handler(async () => ({
    methods: getAllRiseMethods(),
  }))

export const calcDuration = baseProcedure
  .input(calcDurationInputSchema)
  .output(calcDurationOutputSchema)
  .handler(async ({ input }) => {
    const bp: BlendedFlourProps = {
      protein: input.flourProtein,
      W: input.flourW,
      PL: input.flourPL,
      absorption: input.flourAbsorption,
      ash: 0.55,
      fiber: input.flourFiber,
      starchDamage: input.flourStarchDamage,
      fermentSpeed: input.flourFermentSpeed,
      fallingNumber: input.flourFallingNumber,
    }
    return {
      durationMin: calcRiseDuration(
        input.base, input.method, bp,
        input.yeastPct, input.yeastSpeedFactor, input.temperatureFactor,
        undefined, input.saltPct, input.sugarPct, input.fatPct,
      ),
    }
  })

export const maxHoursForW = baseProcedure
  .input(maxHoursForWInputSchema)
  .output(maxHoursForWOutputSchema)
  .handler(async ({ input }) => ({
    maxHours: maxRiseHoursForW(input.W),
  }))
