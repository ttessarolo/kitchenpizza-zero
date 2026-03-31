/**
 * Regression fixture capture script.
 *
 * Runs the V1 reconciler on each fixture graph and saves
 * { input, output } pairs as JSON for parity testing.
 *
 * Usage: npx tsx tests/helpers/capture-regression.ts
 */
import { resolve, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import { reconcileGraph } from '../../app/server/services/graph-reconciler.service'
import { FileScienceProvider } from '../../commons/utils/science/science-provider'
import { MARGHERITA_GRAPH } from '../synthetic_data/pizza_margherita_graph'
import { PANE_BICOLORE_GRAPH } from '../synthetic_data/pane_bicolore_graph'
import {
  makeDefaultPortioning,
  makeDefaultMeta,
  makeNode,
  makeEdge,
  makeGraph,
  makeRiseNode,
  makeDoughNodeWithFlour,
  makePfCfg,
} from '../synthetic_data/helpers'
import type { RecipeGraph } from '../../commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '../../commons/types/recipe'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

const outDir = resolve(__dirname, '../fixtures/regression')
mkdirSync(outDir, { recursive: true })

// ── Fixture definitions ─────────────────────────────────────

interface FixtureDef {
  name: string
  graph: RecipeGraph
  portioning: Portioning
  meta: RecipeMeta
}

// 1. Pizza Margherita (standard base case)
const margheritaFixture: FixtureDef = {
  name: 'margherita',
  graph: MARGHERITA_GRAPH,
  portioning: makeDefaultPortioning({ targetHyd: 65, doughHours: 6, yeastPct: 0.3, saltPct: 2.0, fatPct: 3 }),
  meta: makeDefaultMeta({ type: 'pizza', subtype: 'napoletana' }),
}

// 2. Pane Bicolore (split/join topology)
const bicoloreFixture: FixtureDef = {
  name: 'pane-bicolore',
  graph: PANE_BICOLORE_GRAPH,
  portioning: makeDefaultPortioning({ targetHyd: 60, doughHours: 18, yeastPct: 0.22 }),
  meta: makeDefaultMeta({ type: 'pane', subtype: 'pane_comune' }),
}

// 3. Focaccia Genovese (high hydration - 80%)
const focacciaGraph = makeGraph(
  [
    makeDoughNodeWithFlour('dough', 'gt_00_for', 500),
    makeRiseNode('rise1', 120, 'room'),
    makeNode({ id: 'shape', type: 'shape', data: { title: 'Stendi in teglia', baseDur: 10, shapeCount: 1 } }),
    makeRiseNode('rise2', 60, 'room'),
    makeNode({
      id: 'bake', type: 'bake',
      data: {
        title: 'Cottura', baseDur: 20,
        ovenCfg: { panType: 'alu', ovenType: 'electric', ovenMode: 'fan', temp: 220, cieloPct: 50, shelfPosition: 2 },
      },
    }),
    makeNode({ id: 'done', type: 'done', data: { title: 'Pronta!', baseDur: 0 } }),
  ],
  [
    makeEdge('dough', 'rise1'),
    makeEdge('rise1', 'shape'),
    makeEdge('shape', 'rise2'),
    makeEdge('rise2', 'bake'),
    makeEdge('bake', 'done'),
  ],
)

// Override dough liquids for 80% hydration
const focacciaDough = focacciaGraph.nodes.find(n => n.id === 'dough')!
focacciaDough.data.liquids = [{ id: 1, type: 'water', g: 400, temp: null }]
focacciaDough.data.fats = [{ id: 1, type: 'olio_evo', g: 50 }]

const focacciaFixture: FixtureDef = {
  name: 'focaccia-genovese',
  graph: focacciaGraph,
  portioning: makeDefaultPortioning({ targetHyd: 80, doughHours: 4, yeastPct: 0.5, saltPct: 2.0, fatPct: 10 }),
  meta: makeDefaultMeta({ type: 'focaccia', subtype: 'genovese' }),
}

// 4. Pane Integrale (whole grain flour blend)
const integraleGraph = makeGraph(
  [
    makeNode({
      id: 'dough', type: 'dough', subtype: 'hand',
      data: {
        title: 'Impasto integrale', baseDur: 20,
        flours: [
          { id: 1, type: 'gt_int_mac', g: 300, temp: null },
          { id: 2, type: 'gt_00_for', g: 200, temp: null },
        ],
        liquids: [{ id: 1, type: 'water', g: 375, temp: null }],
        yeasts: [{ id: 1, type: 'fresh', g: 5 }],
        salts: [{ id: 1, type: 'sale_fino', g: 12 }],
        fats: [{ id: 1, type: 'olio_evo', g: 15 }],
      },
    }),
    makeRiseNode('rise1', 60, 'room'),
    makeNode({ id: 'shape', type: 'shape', data: { title: 'Forma', baseDur: 10 } }),
    makeRiseNode('rise2', 720, 'fridge'),
    makeRiseNode('rise3', 60, 'room'),
    makeNode({
      id: 'bake', type: 'bake',
      data: {
        title: 'Cottura', baseDur: 40,
        ovenCfg: { panType: 'ci_lid', ovenType: 'electric', ovenMode: 'static', temp: 220, cieloPct: 50, shelfPosition: 2 },
      },
    }),
    makeNode({ id: 'done', type: 'done', data: { title: 'Pronto', baseDur: 0 } }),
  ],
  [
    makeEdge('dough', 'rise1'),
    makeEdge('rise1', 'shape'),
    makeEdge('shape', 'rise2'),
    makeEdge('rise2', 'rise3'),
    makeEdge('rise3', 'bake'),
    makeEdge('bake', 'done'),
  ],
)

const integraleFixture: FixtureDef = {
  name: 'pane-integrale',
  graph: integraleGraph,
  portioning: makeDefaultPortioning({ targetHyd: 75, doughHours: 24, yeastPct: 0.15, saltPct: 2.4 }),
  meta: makeDefaultMeta({ type: 'pane', subtype: 'pane_integrale' }),
}

// 5. Brioche (enriched dough - high fat)
const briocheGraph = makeGraph(
  [
    makeNode({
      id: 'dough', type: 'dough', subtype: 'hand',
      data: {
        title: 'Impasto brioche', baseDur: 25,
        flours: [{ id: 1, type: 'gt_00_deb', g: 500, temp: null }],
        liquids: [{ id: 1, type: 'milk', g: 150, temp: null }],
        yeasts: [{ id: 1, type: 'fresh', g: 15 }],
        salts: [{ id: 1, type: 'sale_fino', g: 8 }],
        sugars: [{ id: 1, type: 'zucchero', g: 60 }],
        fats: [{ id: 1, type: 'burro', g: 125 }],
        extras: [{ id: 1, name: 'Uova', g: 100 }],
      },
    }),
    makeRiseNode('rise1', 120, 'room'),
    makeNode({ id: 'shape', type: 'shape', data: { title: 'Forma brioche', baseDur: 15, shapeCount: 8 } }),
    makeRiseNode('rise2', 90, 'room'),
    makeNode({
      id: 'bake', type: 'bake',
      data: {
        title: 'Cottura', baseDur: 25,
        ovenCfg: { panType: 'alu', ovenType: 'electric', ovenMode: 'fan', temp: 180, cieloPct: 50, shelfPosition: 2 },
      },
    }),
    makeNode({ id: 'done', type: 'done', data: { title: 'Pronta', baseDur: 0 } }),
  ],
  [
    makeEdge('dough', 'rise1'),
    makeEdge('rise1', 'shape'),
    makeEdge('shape', 'rise2'),
    makeEdge('rise2', 'bake'),
    makeEdge('bake', 'done'),
  ],
)

const briocheFixture: FixtureDef = {
  name: 'brioche',
  graph: briocheGraph,
  portioning: makeDefaultPortioning({ targetHyd: 30, doughHours: 4, yeastPct: 0.8, saltPct: 1.6, fatPct: 25 }),
  meta: makeDefaultMeta({ type: 'pane', subtype: 'brioche' }),
}

// 6. Romana Teglia con pre-fermento (biga)
const romanaTeglia = makeGraph(
  [
    makeNode({
      id: 'pf', type: 'pre_ferment', subtype: 'biga',
      data: {
        title: 'Biga', baseDur: 1080,
        flours: [{ id: 1, type: 'gt_00_for', g: 250, temp: null }],
        liquids: [{ id: 1, type: 'water', g: 110, temp: null }],
        yeasts: [{ id: 1, type: 'fresh', g: 0.6 }],
        preFermentCfg: makePfCfg({ preFermentPct: 50, hydrationPct: 44, yeastPct: 0.25 }),
      },
    }),
    makeNode({
      id: 'dough', type: 'dough', subtype: 'hand',
      data: {
        title: 'Impasto finale', baseDur: 20,
        flours: [{ id: 1, type: 'gt_00_for', g: 250, temp: null }],
        liquids: [{ id: 1, type: 'water', g: 275, temp: null }],
        yeasts: [{ id: 1, type: 'fresh', g: 2 }],
        salts: [{ id: 1, type: 'sale_fino', g: 12 }],
        fats: [{ id: 1, type: 'olio_evo', g: 30 }],
      },
    }),
    makeRiseNode('rise1', 180, 'room'),
    makeNode({ id: 'shape', type: 'shape', data: { title: 'Stendi in teglia', baseDur: 10 } }),
    makeRiseNode('rise2', 120, 'room'),
    makeNode({
      id: 'bake', type: 'bake',
      data: {
        title: 'Cottura', baseDur: 20,
        ovenCfg: { panType: 'alu', ovenType: 'electric', ovenMode: 'static', temp: 250, cieloPct: 50, shelfPosition: 2 },
      },
    }),
    makeNode({ id: 'done', type: 'done', data: { title: 'Pronta', baseDur: 0 } }),
  ],
  [
    makeEdge('pf', 'dough'),
    makeEdge('dough', 'rise1'),
    makeEdge('rise1', 'shape'),
    makeEdge('shape', 'rise2'),
    makeEdge('rise2', 'bake'),
    makeEdge('bake', 'done'),
  ],
)

const romanaTegliaFixture: FixtureDef = {
  name: 'romana-teglia',
  graph: romanaTeglia,
  portioning: makeDefaultPortioning({
    mode: 'tray',
    targetHyd: 70,
    doughHours: 24,
    yeastPct: 0.15,
    saltPct: 2.3,
    fatPct: 6,
    preFermento: 'biga',
  }),
  meta: makeDefaultMeta({ type: 'pizza', subtype: 'romana_teglia' }),
}

// ── Run capture ─────────────────────────────────────────────

const fixtures: FixtureDef[] = [
  margheritaFixture,
  bicoloreFixture,
  focacciaFixture,
  integraleFixture,
  briocheFixture,
  romanaTegliaFixture,
]

for (const f of fixtures) {
  console.log(`Capturing: ${f.name}...`)
  const result = reconcileGraph(f.graph, f.portioning, { ...f.meta, locale: 'it' }, provider)

  const fixtureData = {
    input: {
      graph: f.graph,
      portioning: f.portioning,
      meta: f.meta,
    },
    output: {
      graph: result.graph,
      portioning: result.portioning,
      warnings: result.warnings.map(w => ({
        id: w.id,
        sourceNodeId: w.sourceNodeId ?? null,
        category: w.category,
        severity: w.severity,
        messageKey: w.messageKey,
        messageVars: w.messageVars ?? {},
      })),
    },
  }

  const path = resolve(outDir, `${f.name}.json`)
  writeFileSync(path, JSON.stringify(fixtureData, null, 2), 'utf-8')
  console.log(`  → ${path} (${result.warnings.length} warnings)`)
}

console.log('\nDone! All fixtures captured.')
