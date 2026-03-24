/**
 * Pizza Margherita with "Salsa Pomodoro" prep lane.
 * Main lane: dough → rise → shape → rise → pre_bake(topping) → bake → post_bake(garnish) → done
 * Prep lane: prep:cut → prep:cook → prep:cool → (converges to pre_bake)
 */
import type { RecipeGraph } from '@commons/types/recipe-graph'

export const MARGHERITA_GRAPH: RecipeGraph = {
  lanes: [
    { id: 'main', label: 'Impasto Pizza', isMain: true, origin: { type: 'user' } },
    { id: 'salsa', label: 'Salsa Pomodoro', isMain: false, origin: { type: 'prep' } },
  ],
  nodes: [
    {
      id: 'dough', type: 'dough', subtype: 'hand', lane: 'main',
      position: { x: 0, y: 0 },
      data: {
        title: 'Impasto', desc: '', group: 'Impasto', baseDur: 15, restDur: 0, restTemp: null,
        flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
        liquids: [{ id: 0, type: 'Acqua', g: 325, temp: null }],
        extras: [], yeasts: [{ id: 0, type: 'fresh', g: 3 }],
        salts: [{ id: 0, type: 'sale_fino', g: 10 }],
        sugars: [], fats: [{ id: 0, type: 'olio_evo', g: 15 }],
      },
    },
    {
      id: 'rise1', type: 'rise', subtype: 'room', lane: 'main',
      position: { x: 0, y: 100 },
      data: {
        title: '1ª lievitazione', desc: '', group: 'Impasto', baseDur: 120, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        riseMethod: 'room',
      },
    },
    {
      id: 'shape', type: 'shape', subtype: null, lane: 'main',
      position: { x: 0, y: 200 },
      data: {
        title: 'Forma palline', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        shapeCount: 4,
      },
    },
    {
      id: 'rise2', type: 'rise', subtype: 'room', lane: 'main',
      position: { x: 0, y: 300 },
      data: {
        title: 'Appretto', desc: '', group: 'Impasto', baseDur: 180, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        riseMethod: 'room',
      },
    },
    {
      id: 'top', type: 'pre_bake', subtype: 'topping', lane: 'main',
      position: { x: 0, y: 400 },
      data: {
        title: 'Condisci pizza', desc: '', group: 'Impasto', baseDur: 3, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      },
    },
    {
      id: 'bake', type: 'bake', subtype: null, lane: 'main',
      position: { x: 0, y: 500 },
      data: {
        title: 'Inforna', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        ovenCfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 300, cieloPct: 50, shelfPosition: 2 },
      },
    },
    {
      id: 'garnish', type: 'post_bake', subtype: 'garnish', lane: 'main',
      position: { x: 0, y: 600 },
      data: {
        title: 'Basilico + olio', desc: '', group: 'Impasto', baseDur: 1, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      },
    },
    {
      id: 'done', type: 'done', subtype: null, lane: 'main',
      position: { x: 0, y: 700 },
      data: {
        title: 'Buon appetito!', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      },
    },
    // ── Prep lane: Salsa ──
    {
      id: 's_cut', type: 'prep', subtype: 'cut', lane: 'salsa',
      position: { x: 300, y: 0 },
      data: {
        title: 'Taglia pomodori', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null,
        flours: [], liquids: [], yeasts: [], salts: [], sugars: [], fats: [],
        extras: [{ id: 0, name: 'Pomodori San Marzano', g: 400 }],
        cutStyle: 'rough_chop', applicationMethod: 'topping', applicationTiming: 'pre_bake',
      },
    },
    {
      id: 's_cook', type: 'prep', subtype: 'cook', lane: 'salsa',
      position: { x: 300, y: 100 },
      data: {
        title: 'Cuoci salsa', desc: '', group: 'Impasto', baseDur: 30, restDur: 0, restTemp: null,
        flours: [], liquids: [], yeasts: [], salts: [{ id: 0, type: 'sale_fino', g: 3 }], sugars: [], fats: [{ id: 0, type: 'olio_evo', g: 15 }],
        extras: [{ id: 0, name: 'Aglio', g: 5 }],
        cookMethod: 'pan', cookTemp: 100,
      },
    },
    {
      id: 's_cool', type: 'prep', subtype: 'cool', lane: 'salsa',
      position: { x: 300, y: 200 },
      data: {
        title: 'Raffredda salsa', desc: '', group: 'Impasto', baseDur: 30, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'dough', target: 'rise1', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e2', source: 'rise1', target: 'shape', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e3', source: 'shape', target: 'rise2', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e4', source: 'rise2', target: 'top', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e5', source: 'top', target: 'bake', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e6', source: 'bake', target: 'garnish', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e7', source: 'garnish', target: 'done', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    // Prep lane
    { id: 'e8', source: 's_cut', target: 's_cook', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e9', source: 's_cook', target: 's_cool', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    // Convergence: prep → main
    { id: 'e10', source: 's_cool', target: 'top', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
  ],
}
