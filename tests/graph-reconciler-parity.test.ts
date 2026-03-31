/**
 * Graph Reconciler Parity Tests
 *
 * Verifies that reconcileGraph produces output matching the captured V1 fixtures.
 * After V2 is implemented, the same fixtures verify V2 === V1 parity.
 */
import { resolve } from 'path'
import { readFileSync, readdirSync } from 'fs'
import { describe, it, expect, beforeAll } from 'vitest'
import { reconcileGraph } from '../app/server/services/graph-reconciler.service'
import { reconcileGraphV2 } from '../app/server/services/graph-reconciler-v2.service'
import { FileScienceProvider } from '../commons/utils/science/science-provider'
import type { RecipeGraph, ActionableWarning } from '../commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '../commons/types/recipe'

const FIXTURE_DIR = resolve(__dirname, 'fixtures/regression')

interface WarningSnapshot {
  id: string
  sourceNodeId: string | null
  category: string
  severity: string
  messageKey: string
  messageVars: Record<string, unknown>
}

interface Fixture {
  input: { graph: RecipeGraph; portioning: Portioning; meta: RecipeMeta }
  output: { graph: RecipeGraph; portioning: Portioning; warnings: WarningSnapshot[] }
}

let provider: InstanceType<typeof FileScienceProvider>
let fixtureNames: string[]

beforeAll(() => {
  provider = new FileScienceProvider(
    resolve(process.cwd(), 'science'),
    resolve(process.cwd(), 'commons/i18n'),
  )
  fixtureNames = readdirSync(FIXTURE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
})

function loadFixture(name: string): Fixture {
  const raw = readFileSync(resolve(FIXTURE_DIR, `${name}.json`), 'utf-8')
  return JSON.parse(raw) as Fixture
}

function normalizeWarnings(warnings: ActionableWarning[]): WarningSnapshot[] {
  return warnings.map(w => ({
    id: w.id,
    sourceNodeId: w.sourceNodeId ?? null,
    category: w.category,
    severity: w.severity,
    messageKey: w.messageKey,
    messageVars: w.messageVars ?? {},
  }))
}

describe('Reconciler V1 — Sanity check against captured fixtures', () => {
  it('has fixture files', () => {
    expect(fixtureNames.length).toBeGreaterThanOrEqual(6)
  })

  describe.each([
    'margherita',
    'pane-bicolore',
    'focaccia-genovese',
    'pane-integrale',
    'brioche',
    'romana-teglia',
  ])('fixture: %s', (name) => {
    it('produces matching warnings (messageKey + severity)', () => {
      const fixture = loadFixture(name)
      const result = reconcileGraph(
        fixture.input.graph,
        fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' },
        provider,
      )

      const actualWarnings = normalizeWarnings(result.warnings)
      const expectedWarnings = fixture.output.warnings

      // Warning messageKeys must match exactly
      const actualKeys = actualWarnings.map(w => w.messageKey).sort()
      const expectedKeys = expectedWarnings.map(w => w.messageKey).sort()
      expect(actualKeys).toEqual(expectedKeys)

      // Warning severities must match
      const actualSeverities = actualWarnings.map(w => `${w.messageKey}:${w.severity}`).sort()
      const expectedSeverities = expectedWarnings.map(w => `${w.messageKey}:${w.severity}`).sort()
      expect(actualSeverities).toEqual(expectedSeverities)
    })

    it('produces matching node count', () => {
      const fixture = loadFixture(name)
      const result = reconcileGraph(
        fixture.input.graph,
        fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' },
        provider,
      )
      expect(result.graph.nodes.length).toBe(fixture.output.graph.nodes.length)
    })

    it('produces matching numeric values within tolerance', () => {
      const fixture = loadFixture(name)
      const result = reconcileGraph(
        fixture.input.graph,
        fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' },
        provider,
      )

      for (const expectedNode of fixture.output.graph.nodes) {
        const actualNode = result.graph.nodes.find(n => n.id === expectedNode.id)
        expect(actualNode, `Node ${expectedNode.id} should exist`).toBeDefined()
        if (!actualNode) continue

        // baseDur tolerance: 1 minute
        if (expectedNode.data.baseDur > 0) {
          expect(Math.abs(actualNode.data.baseDur - expectedNode.data.baseDur))
            .toBeLessThanOrEqual(1)
        }

        // Ingredient quantities tolerance: 0.1% or 0.5g
        for (const flour of expectedNode.data.flours ?? []) {
          const actualFlour = actualNode.data.flours?.find(f => f.id === flour.id)
          if (actualFlour && flour.g > 0) {
            const tolerance = Math.max(flour.g * 0.001, 0.5)
            expect(Math.abs(actualFlour.g - flour.g)).toBeLessThanOrEqual(tolerance)
          }
        }

        for (const liquid of expectedNode.data.liquids ?? []) {
          const actualLiquid = actualNode.data.liquids?.find(l => l.id === liquid.id)
          if (actualLiquid && liquid.g > 0) {
            const tolerance = Math.max(liquid.g * 0.001, 0.5)
            expect(Math.abs(actualLiquid.g - liquid.g)).toBeLessThanOrEqual(tolerance)
          }
        }
      }
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// V2 vs V1 Parity — V2 must produce IDENTICAL output to V1
// ═══════════════════════════════════════════════════════════════

describe('Reconciler V2 — Parity with V1', () => {
  describe.each([
    'margherita',
    'pane-bicolore',
    'focaccia-genovese',
    'pane-integrale',
    'brioche',
    'romana-teglia',
  ])('fixture: %s', (name) => {
    it('V2 warnings match V1 warnings (messageKey + severity)', () => {
      const fixture = loadFixture(name)
      const v1 = reconcileGraph(
        fixture.input.graph, fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' }, provider,
      )
      const v2 = reconcileGraphV2(
        fixture.input.graph, fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' }, provider,
      )

      const v1Keys = normalizeWarnings(v1.warnings).map(w => w.messageKey).sort()
      const v2Keys = normalizeWarnings(v2.warnings).map(w => w.messageKey).sort()
      expect(v2Keys).toEqual(v1Keys)

      const v1Sevs = normalizeWarnings(v1.warnings).map(w => `${w.messageKey}:${w.severity}`).sort()
      const v2Sevs = normalizeWarnings(v2.warnings).map(w => `${w.messageKey}:${w.severity}`).sort()
      expect(v2Sevs).toEqual(v1Sevs)
    })

    it('V2 node count matches V1', () => {
      const fixture = loadFixture(name)
      const v1 = reconcileGraph(
        fixture.input.graph, fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' }, provider,
      )
      const v2 = reconcileGraphV2(
        fixture.input.graph, fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' }, provider,
      )
      expect(v2.graph.nodes.length).toBe(v1.graph.nodes.length)
    })

    it('V2 numeric values match V1 within tolerance', () => {
      const fixture = loadFixture(name)
      const v1 = reconcileGraph(
        fixture.input.graph, fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' }, provider,
      )
      const v2 = reconcileGraphV2(
        fixture.input.graph, fixture.input.portioning,
        { ...fixture.input.meta, locale: 'it' }, provider,
      )

      for (const v1Node of v1.graph.nodes) {
        const v2Node = v2.graph.nodes.find(n => n.id === v1Node.id)
        expect(v2Node, `V2 missing node ${v1Node.id}`).toBeDefined()
        if (!v2Node) continue

        // baseDur: within 1 minute
        expect(Math.abs(v2Node.data.baseDur - v1Node.data.baseDur))
          .toBeLessThanOrEqual(1)

        // Flour grams: within 0.1% or 0.5g
        for (const f of v1Node.data.flours ?? []) {
          const v2f = v2Node.data.flours?.find(x => x.id === f.id)
          if (v2f && f.g > 0) {
            expect(Math.abs(v2f.g - f.g)).toBeLessThanOrEqual(Math.max(f.g * 0.001, 0.5))
          }
        }

        // Liquid grams: within 0.1% or 0.5g
        for (const l of v1Node.data.liquids ?? []) {
          const v2l = v2Node.data.liquids?.find(x => x.id === l.id)
          if (v2l && l.g > 0) {
            expect(Math.abs(v2l.g - l.g)).toBeLessThanOrEqual(Math.max(l.g * 0.001, 0.5))
          }
        }
      }
    })
  })
})
