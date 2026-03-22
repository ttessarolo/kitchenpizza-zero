import { baseProcedure } from '../middleware/auth'
import { healthResponseSchema } from '../schemas/common'
import { healthService } from '../services/health.service'

export const healthCheck = baseProcedure
  .output(healthResponseSchema)
  .handler(async () => {
    return healthService.check()
  })
