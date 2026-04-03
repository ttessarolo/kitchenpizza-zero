import { baseProcedure } from '../middleware/auth'
import {
  getCatalogOutputSchema,
  getByIdInputSchema, getByIdOutputSchema,
  searchInputSchema, searchOutputSchema,
  suggestForWInputSchema, suggestForWOutputSchema,
  estimateWInputSchema, estimateWOutputSchema,
  blendPropertiesInputSchema, blendPropertiesOutputSchema,
  estimateBlendWInputSchema, estimateBlendWOutputSchema,
} from '../schemas/flour'
import {
  getFlour, searchFlours, suggestForW, estimateW,
  blendFlourProperties, estimateBlendW,
} from '@commons/utils/flour-manager'
import { FLOUR_CATALOG, FLOUR_GROUPS } from '../../../local_data/flour-catalog'
import { getScienceProvider } from '../middleware/science'

export const getCatalog = baseProcedure
  .output(getCatalogOutputSchema)
  .handler(async () => ({
    flours: FLOUR_CATALOG as any,
    groups: [...FLOUR_GROUPS],
  }))

export const getById = baseProcedure
  .input(getByIdInputSchema)
  .output(getByIdOutputSchema)
  .handler(async ({ input }) => getFlour(input.key, FLOUR_CATALOG as any))

export const search = baseProcedure
  .input(searchInputSchema)
  .output(searchOutputSchema)
  .handler(async ({ input }) => ({
    results: searchFlours(input.query, FLOUR_CATALOG as any),
  }))

export const suggestByW = baseProcedure
  .input(suggestForWInputSchema)
  .output(suggestForWOutputSchema)
  .handler(async ({ input }) => ({
    results: suggestForW(input.targetW, FLOUR_CATALOG as any, input.tolerance),
  }))

export const estimateWFromProtein = baseProcedure
  .input(estimateWInputSchema)
  .output(estimateWOutputSchema)
  .handler(async ({ input }) => {
    const provider = await getScienceProvider()
    return { W: estimateW(input.protein, provider) }
  })

export const blendProperties = baseProcedure
  .input(blendPropertiesInputSchema)
  .output(blendPropertiesOutputSchema)
  .handler(async ({ input }) => {
    return blendFlourProperties(input.flours as any, FLOUR_CATALOG as any)
  })

export const estimateBlendWProcedure = baseProcedure
  .input(estimateBlendWInputSchema)
  .output(estimateBlendWOutputSchema)
  .handler(async ({ input }) => ({
    W: estimateBlendW(input.flourKeys, FLOUR_CATALOG as any),
  }))
