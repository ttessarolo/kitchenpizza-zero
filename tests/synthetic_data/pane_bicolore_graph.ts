/**
 * Pane bicolore with split 60/40 + join braid.
 * Main: dough → rise → split → (two branches) → join → rise → bake → done
 */
import type { RecipeGraph } from '@commons/types/recipe-graph'

export const PANE_BICOLORE_GRAPH: RecipeGraph = {
  lanes: [
    { id: 'main', label: 'Impasto base', isMain: true, origin: { type: 'user' } },
    { id: 'split_0', label: 'Impasto bianco', isMain: false, origin: { type: 'split', splitNodeId: 'split' } },
    { id: 'split_1', label: 'Impasto al cacao', isMain: false, origin: { type: 'split', splitNodeId: 'split' } },
  ],
  nodes: [
    {
      id: 'dough', type: 'dough', subtype: 'hand', lane: 'main',
      position: { x: 0, y: 0 },
      data: {
        title: 'Impasto base', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null,
        flours: [{ id: 0, type: 'gt_00_for', g: 600, temp: null }],
        liquids: [{ id: 0, type: 'Acqua', g: 360, temp: null }],
        extras: [], yeasts: [{ id: 0, type: 'fresh', g: 6 }],
        salts: [{ id: 0, type: 'sale_fino', g: 12 }],
        sugars: [], fats: [{ id: 0, type: 'olio_evo', g: 22 }],
      },
    },
    {
      id: 'rise1', type: 'rise', subtype: 'room', lane: 'main',
      position: { x: 0, y: 100 },
      data: {
        title: '1ª lievitazione', desc: '', group: 'Impasto', baseDur: 60, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        riseMethod: 'room',
      },
    },
    {
      id: 'split', type: 'split', subtype: null, lane: 'main',
      position: { x: 0, y: 200 },
      data: {
        title: 'Dividi impasto', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        splitMode: 'pct',
        splitOutputs: [
          { handle: 'out_0', label: 'Bianco', value: 60 },
          { handle: 'out_1', label: 'Al cacao', value: 40 },
        ],
      },
    },
    // ── Branch 0: bianco ──
    {
      id: 'shape_w', type: 'shape', subtype: null, lane: 'split_0',
      position: { x: -150, y: 300 },
      data: {
        title: 'Forma filone bianco', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      },
    },
    // ── Branch 1: cacao ──
    {
      id: 'cocoa', type: 'prep', subtype: 'mix', lane: 'split_1',
      position: { x: 150, y: 300 },
      data: {
        title: 'Aggiungi cacao', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null,
        flours: [], liquids: [], yeasts: [], salts: [], sugars: [], fats: [],
        extras: [{ id: 0, name: 'Cacao amaro', g: 20 }],
      },
    },
    {
      id: 'shape_d', type: 'shape', subtype: null, lane: 'split_1',
      position: { x: 150, y: 400 },
      data: {
        title: 'Forma filone scuro', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      },
    },
    // ── Join ──
    {
      id: 'join', type: 'join', subtype: 'braid', lane: 'main',
      position: { x: 0, y: 500 },
      data: {
        title: 'Intreccia', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        joinMethod: 'braid',
      },
    },
    {
      id: 'rise2', type: 'rise', subtype: 'room', lane: 'main',
      position: { x: 0, y: 600 },
      data: {
        title: '2ª lievitazione', desc: '', group: 'Impasto', baseDur: 90, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        riseMethod: 'room',
      },
    },
    {
      id: 'bake', type: 'bake', subtype: null, lane: 'main',
      position: { x: 0, y: 700 },
      data: {
        title: 'Cottura', desc: '', group: 'Impasto', baseDur: 35, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        ovenCfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 200, cieloPct: 50, shelfPosition: 2 },
      },
    },
    {
      id: 'done', type: 'done', subtype: null, lane: 'main',
      position: { x: 0, y: 800 },
      data: {
        title: 'Pronto!', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'dough', target: 'rise1', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e2', source: 'rise1', target: 'split', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    // Split outputs
    { id: 'e3', source: 'split', target: 'shape_w', sourceHandle: 'out_0', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 0.6 } },
    { id: 'e4', source: 'split', target: 'cocoa', sourceHandle: 'out_1', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 0.4 } },
    // Branch 1
    { id: 'e5', source: 'cocoa', target: 'shape_d', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    // Join
    { id: 'e6', source: 'shape_w', target: 'join', targetHandle: 'in_0', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e7', source: 'shape_d', target: 'join', targetHandle: 'in_1', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    // After join
    { id: 'e8', source: 'join', target: 'rise2', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e9', source: 'rise2', target: 'bake', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
    { id: 'e10', source: 'bake', target: 'done', data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 } },
  ],
}
