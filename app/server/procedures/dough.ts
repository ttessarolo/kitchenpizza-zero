import { baseProcedure } from '../middleware/auth'
import {
  blendFloursInputSchema, blendFloursOutputSchema,
  calcYeastInputSchema, calcYeastOutputSchema,
  calcTempInputSchema, calcTempOutputSchema,
  getDefaultsInputSchema, getDefaultsOutputSchema,
  getWarningsInputSchema, getWarningsOutputSchema,
  calcDurationInputSchema, calcDurationOutputSchema,
  getCompositionPctsInputSchema, getCompositionPctsOutputSchema,
} from '../schemas/dough'
import {
  blendFlourProperties, calcYeastPct, calcFinalDoughTemp,
  getDoughDefaults, getDoughWarnings,
  calcDurationFromYeast, getSaltPct, getSugarPct, getFatPct,
} from '@commons/utils/dough-manager'
import { FLOUR_CATALOG } from '../../../local_data/flour-catalog'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

export const blendFlours = baseProcedure
  .input(blendFloursInputSchema)
  .output(blendFloursOutputSchema)
  .handler(async ({ input }) => {
    return blendFlourProperties(input.flours as any, FLOUR_CATALOG as any)
  })

export const calcYeast = baseProcedure
  .input(calcYeastInputSchema)
  .output(calcYeastOutputSchema)
  .handler(async ({ input }) => ({
    yeastPct: calcYeastPct(provider, input.hours, input.tempC),
  }))

export const calcTemp = baseProcedure
  .input(calcTempInputSchema)
  .output(calcTempOutputSchema)
  .handler(async ({ input }) => ({
    finalTemp: calcFinalDoughTemp(input.flours as any, input.liquids as any, input.ambientTemp, input.frictionFactor),
  }))

export const getDefaults = baseProcedure
  .input(getDefaultsInputSchema)
  .output(getDefaultsOutputSchema)
  .handler(async ({ input }) => {
    return getDoughDefaults(input.recipeType, input.recipeSubtype)
  })

export const getWarnings = baseProcedure
  .input(getWarningsInputSchema)
  .output(getWarningsOutputSchema)
  .handler(async ({ input }) => ({
    warnings: getDoughWarnings(provider, input),
  }))

export const calcDuration = baseProcedure
  .input(calcDurationInputSchema)
  .output(calcDurationOutputSchema)
  .handler(async ({ input }) => ({
    hours: calcDurationFromYeast(provider, input.yeastPct, input.hydration, input.tempC),
  }))

export const getCompositionPcts = baseProcedure
  .input(getCompositionPctsInputSchema)
  .output(getCompositionPctsOutputSchema)
  .handler(async ({ input }) => ({
    saltPct: getSaltPct(input.salts as any, input.totalFlour),
    sugarPct: getSugarPct(input.sugars as any, input.totalFlour),
    fatPct: getFatPct(input.fats as any, input.totalFlour),
  }))
