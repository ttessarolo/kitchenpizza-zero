import { makeStep, makeDep, makeRecipe, makePfCfg } from './helpers'

/**
 * 100% Biga bread — ALL flour/water is in the pre-ferment.
 * Total dough ~1000g, 65% hydration
 * totalFlour = 1000 / 1.65 ≈ 606g
 * totalLiquid = 606 * 0.65 ≈ 394g
 * pfWeight = 1000 (100%)
 * pfFlour = 1000 / 1.44 ≈ 694g  (but this exceeds totalFlour!)
 *
 * At 100% biga with 44% hydration:
 * The biga contains ALL the dough weight, meaning the main dough step
 * has 0g flour and 0g water — only salt/extras are added during mixing.
 */
export const BIGA_100_STEPS = [
  makeStep({
    id: 'biga_prep', type: 'pre_ferment', subtype: 'biga', group: 'Biga',
    title: 'Preparazione Biga', baseDur: 15,
    flours: [{ id: 0, type: 'gt_0_for', g: 606, temp: null }],
    liquids: [{ id: 0, type: 'Acqua', g: 394, temp: null }],
    yeasts: [{ id: 0, type: 'fresh', g: 6, }],
    preFermentCfg: makePfCfg({ preFermentPct: 100, hydrationPct: 65, yeastPct: 1 }),
  }),
  makeStep({
    id: 'biga_ferment', type: 'rise', subtype: 'ctrl18', group: 'Biga',
    title: 'Maturazione Biga', baseDur: 1080,
    deps: [makeDep('biga_prep', 1, 1)],
    riseMethod: 'ctrl18',
    sourcePrep: 'biga_prep',
  }),
  makeStep({
    id: 'knead', type: 'dough', subtype: 'hand', group: 'Impasto',
    title: 'Impasto Finale', baseDur: 15,
    deps: [makeDep('biga_ferment', 1, 1)],
    kneadMethod: 'hand',
    // No flour or water — everything is in the biga
    flours: [],
    liquids: [],
    extras: [{ id: 0, name: 'Sale', g: 20 }],
  }),
  makeStep({
    id: 'done', type: 'done', group: 'Impasto',
    title: 'Fine', baseDur: 0,
    deps: [makeDep('knead', 1, 1)],
  }),
]

export const BIGA_100_RECIPE = makeRecipe(BIGA_100_STEPS, ['Biga', 'Impasto'])
