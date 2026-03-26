import { describe, it, expect } from 'vitest'
import { computeGroupedIngredients } from '@commons/utils/ingredient-manager'
import { makeNode, makeEdge, makeGraph } from './synthetic_data/helpers'

describe('IngredientManager — computeGroupedIngredients', () => {
  it('aggregates flours by group', () => {
    const graph = makeGraph(
      [
        makeNode({ id: 'dough', type: 'dough', data: {
          title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null,
          flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
          liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
          extras: [], yeasts: [{ id: 0, type: 'fresh', g: 2 }],
          salts: [{ id: 0, type: 'sale_fino', g: 12 }], sugars: [], fats: [],
        }}),
      ],
      [],
    )
    const grouped = computeGroupedIngredients(graph, ['Impasto'])
    expect(grouped['Impasto'].flours).toHaveLength(1)
    expect(grouped['Impasto'].flours[0].g).toBe(500)
    expect(grouped['Impasto'].liquids[0].g).toBe(300)
    expect(grouped['Impasto'].salts[0].g).toBe(12)
  })

  it('merges same-type ingredients across nodes', () => {
    const graph = makeGraph(
      [
        makeNode({ id: 'pf', type: 'pre_ferment', data: {
          title: 'Biga', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null,
          flours: [{ id: 0, type: 'gt_00_for', g: 200, temp: null }],
          liquids: [{ id: 0, type: 'Acqua', g: 88, temp: null }],
          extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        }}),
        makeNode({ id: 'dough', type: 'dough', data: {
          title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null,
          flours: [{ id: 0, type: 'gt_00_for', g: 300, temp: null }],
          liquids: [{ id: 0, type: 'Acqua', g: 212, temp: null }],
          extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        }}),
      ],
      [makeEdge('pf', 'dough')],
    )
    const grouped = computeGroupedIngredients(graph, ['Impasto'])
    // Same type merged: 200 + 300 = 500
    expect(grouped['Impasto'].flours).toHaveLength(1)
    expect(grouped['Impasto'].flours[0].g).toBe(500)
    expect(grouped['Impasto'].liquids[0].g).toBe(300) // 88 + 212
  })

  it('separates ingredients by group', () => {
    const graph = makeGraph(
      [
        makeNode({ id: 'dough', type: 'dough', data: {
          title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null,
          flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
          liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        }}),
        makeNode({ id: 'bake', type: 'bake', data: {
          title: 'Cottura', desc: '', group: 'Cottura Impasto', baseDur: 30, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [],
          fats: [], cookingFats: [{ id: 0, type: 'olio_arachidi', g: 500 }],
        }}),
      ],
      [makeEdge('dough', 'bake')],
    )
    const grouped = computeGroupedIngredients(graph, ['Impasto', 'Cottura Impasto'])
    expect(grouped['Impasto'].flours).toHaveLength(1)
    expect(grouped['Cottura Impasto'].fats).toHaveLength(1)
    expect(grouped['Cottura Impasto'].fats[0].g).toBe(500)
  })

  it('returns empty groups for missing groups', () => {
    const graph = makeGraph([makeNode({ id: 'dough', type: 'dough' })], [])
    const grouped = computeGroupedIngredients(graph, ['Impasto', 'Extra'])
    expect(grouped['Extra'].flours).toHaveLength(0)
  })
})
