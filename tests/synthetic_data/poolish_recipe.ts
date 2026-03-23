import { makeStep, makeDep, makeRecipe, makePfCfg } from './helpers'

/** Poolish-based bread — 40% pre-ferment, 100% hydration */
export const POOLISH_STEPS = [
  makeStep({
    id: 'poolish_prep', type: 'pre_ferment', subtype: 'poolish', group: 'Poolish',
    title: 'Preparazione Poolish', baseDur: 10,
    flours: [{ id: 0, type: 'gt_0_for', g: 200, temp: null }],
    liquids: [{ id: 0, type: 'Acqua', g: 200, temp: 20 }],
    yeasts: [{ id: 0, type: 'fresh', g: 0.2 }],
    preFermentCfg: makePfCfg({ preFermentPct: 40, hydrationPct: 100, yeastPct: 0.1, fermentTemp: 20, fermentDur: 720 }),
  }),
  makeStep({
    id: 'poolish_ferment', type: 'rise', subtype: 'room', group: 'Poolish',
    title: 'Maturazione Poolish', baseDur: 720,
    deps: [makeDep('poolish_prep', 1, 1)],
    riseMethod: 'room',
    sourcePrep: 'poolish_prep',
  }),
  makeStep({
    id: 'knead', type: 'dough', subtype: 'hand', group: 'Impasto',
    title: 'Impasto Finale', baseDur: 20,
    deps: [makeDep('poolish_ferment', 1, 1)],
    kneadMethod: 'hand',
    flours: [{ id: 0, type: 'gt_0_for', g: 400, temp: null }],
    liquids: [{ id: 0, type: 'Acqua', g: 180, temp: null }],
    extras: [{ id: 0, name: 'Sale', g: 18 }],
  }),
  makeStep({
    id: 'done', type: 'done', group: 'Impasto',
    title: 'Fine', baseDur: 0,
    deps: [makeDep('knead', 1, 1)],
  }),
]

export const POOLISH_RECIPE = makeRecipe(POOLISH_STEPS, ['Poolish', 'Impasto'])
