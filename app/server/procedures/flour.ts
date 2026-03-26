import { baseProcedure } from '../middleware/auth'
import {
  getCatalogOutputSchema,
  getByIdInputSchema, getByIdOutputSchema,
  searchInputSchema, searchOutputSchema,
  suggestForWInputSchema, suggestForWOutputSchema,
  estimateWInputSchema, estimateWOutputSchema,
} from '../schemas/flour'
import {
  FLOUR_CATALOG, FLOUR_GROUPS,
  getFlour, searchFlours, suggestForW, estimateW,
} from '@commons/utils/flour-manager'

export const getCatalog = baseProcedure
  .output(getCatalogOutputSchema)
  .handler(async () => ({
    flours: FLOUR_CATALOG as any,
    groups: [...FLOUR_GROUPS],
  }))

export const getById = baseProcedure
  .input(getByIdInputSchema)
  .output(getByIdOutputSchema)
  .handler(async ({ input }) => getFlour(input.key))

export const search = baseProcedure
  .input(searchInputSchema)
  .output(searchOutputSchema)
  .handler(async ({ input }) => ({
    results: searchFlours(input.query),
  }))

export const suggestByW = baseProcedure
  .input(suggestForWInputSchema)
  .output(suggestForWOutputSchema)
  .handler(async ({ input }) => ({
    results: suggestForW(input.targetW, undefined, input.tolerance),
  }))

export const estimateWFromProtein = baseProcedure
  .input(estimateWInputSchema)
  .output(estimateWOutputSchema)
  .handler(async ({ input }) => ({
    W: estimateW(input.protein),
  }))
