import { z } from 'zod'
import { baseProcedure } from '../middleware/auth'
import { getDefaultConfig } from '@commons/utils/bake-manager'

const getDefaultConfigInputSchema = z.object({
  subtype: z.string(),
})

const getDefaultConfigOutputSchema = z.object({
  method: z.string(),
  cfg: z.record(z.string(), z.unknown()),
}).passthrough()

export const getDefaultBakeConfig = baseProcedure
  .input(getDefaultConfigInputSchema)
  .output(getDefaultConfigOutputSchema)
  .handler(async ({ input }) => {
    const result = getDefaultConfig(input.subtype)
    return result as any
  })
