import { baseProcedure } from '../middleware/auth'
import { totalDurationInputSchema, totalDurationOutputSchema } from '../schemas/schedule'
import { totalDuration } from '@commons/utils/schedule-manager'

export const getDuration = baseProcedure
  .input(totalDurationInputSchema)
  .output(totalDurationOutputSchema)
  .handler(async ({ input }) => ({
    spanMinutes: totalDuration(input as any),
  }))
