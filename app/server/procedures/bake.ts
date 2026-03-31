import { z } from 'zod'
import { baseProcedure } from '../middleware/auth'
import { getDefaultConfig } from '@commons/utils/bake-manager'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

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
    const result = getDefaultConfig(input.subtype, provider)
    return result as any
  })
