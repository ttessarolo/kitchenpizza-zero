import { makeStep, makeDep, makeRecipe, makePfCfg } from './helpers'

/** Pane Casareccio con Biga 80% — for pre-ferment tests */
export const BIGA_80_STEPS = [
  makeStep({
    id: 'biga_prep', type: 'pre_ferment', subtype: 'biga', group: 'Biga',
    title: 'Preparazione Biga', baseDur: 15,
    flours: [{ id: 0, type: 'gt_0_for', g: 555.5, temp: null }],
    liquids: [{ id: 0, type: 'Acqua', g: 244.5, temp: 18 }],
    yeasts: [{ id: 0, type: 'fresh', g: 5.5 }],
    preFermentCfg: makePfCfg({ preFermentPct: 80, hydrationPct: 44, yeastPct: 1 }),
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
    title: 'Impasto Finale', baseDur: 20,
    deps: [makeDep('biga_ferment', 1, 1)],
    kneadMethod: 'hand',
    flours: [{ id: 0, type: 'gt_0_for', g: 50.5, temp: null }],
    liquids: [{ id: 0, type: 'Acqua', g: 149.5, temp: null }],
    extras: [{ id: 0, name: 'Sale', g: 20 }],
  }),
  makeStep({
    id: 'done', type: 'done', group: 'Impasto',
    title: 'Fine', baseDur: 0,
    deps: [makeDep('knead', 1, 1)],
  }),
]

export const BIGA_80_RECIPE = makeRecipe(BIGA_80_STEPS, ['Biga', 'Impasto'])
