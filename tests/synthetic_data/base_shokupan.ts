import { makeStep, makeDep, makeRecipe } from './helpers'

/** Simplified Shokupan recipe for testing — 4 key steps */
export const SHOKUPAN_STEPS = [
  makeStep({
    id: 'roux', type: 'pre_dough', subtype: 'tangzhong', group: 'Tangzhong',
    title: 'Tangzhong', baseDur: 5,
    flours: [{ id: 0, type: 'gt_00_deb', g: 22.5, temp: null }],
    liquids: [{ id: 0, type: 'Acqua', g: 112, temp: null }],
  }),
  makeStep({
    id: 'knead', type: 'dough', subtype: 'hand', group: 'Impasto',
    title: 'Impastare', baseDur: 20,
    deps: [makeDep('roux', 1, 1)],
    kneadMethod: 'hand',
    flours: [{ id: 0, type: 'gt_0_for', g: 315, temp: null }],
    liquids: [{ id: 0, type: 'Latte freddo', g: 162, temp: 5 }],
    extras: [{ id: 0, name: 'Sale', g: 7.2 }],
    yeasts: [{ id: 0, type: 'fresh', g: 6.3 }],
  }),
  makeStep({
    id: 'rise1', type: 'rise', subtype: 'room', group: 'Impasto',
    title: '1ª Lievitazione', baseDur: 120,
    deps: [makeDep('knead', 1, 1)],
    riseMethod: 'room',
    sourcePrep: 'knead',
  }),
  makeStep({
    id: 'done', type: 'done', group: 'Impasto',
    title: 'Fine', baseDur: 0,
    deps: [makeDep('rise1', 1, 1)],
  }),
]

export const SHOKUPAN_RECIPE = makeRecipe(SHOKUPAN_STEPS, ['Tangzhong', 'Impasto'])
