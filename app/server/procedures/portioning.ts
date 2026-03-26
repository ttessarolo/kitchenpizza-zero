import { baseProcedure } from '../middleware/auth'
import { calcTargetInputSchema, calcTargetOutputSchema } from '../schemas/portioning'
import { calcTargetWeight } from '@commons/utils/portioning-manager'

export const calcTarget = baseProcedure
  .input(calcTargetInputSchema)
  .output(calcTargetOutputSchema)
  .handler(async ({ input }) => ({
    targetWeight: calcTargetWeight(input as any),
  }))
