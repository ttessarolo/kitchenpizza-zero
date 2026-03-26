import { describe, it, expect } from 'vitest'
import { computeSchedule, computeTimeSummary, totalDuration, getNodeDuration } from '@commons/utils/schedule-manager'
import { makeNode, makeEdge, makeGraph } from './synthetic_data/helpers'

function linearGraph() {
  return makeGraph(
    [
      makeNode({ id: 'dough', type: 'dough', data: { title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
      makeNode({ id: 'rise', type: 'rise', data: { title: 'Lievitazione', desc: '', group: 'Impasto', baseDur: 120, restDur: 30, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
      makeNode({ id: 'bake', type: 'bake', data: { title: 'Cottura', desc: '', group: 'Impasto', baseDur: 30, restDur: 0, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
    ],
    [makeEdge('dough', 'rise'), makeEdge('rise', 'bake')],
  )
}

describe('ScheduleManager — getNodeDuration', () => {
  it('sums baseDur + restDur', () => {
    const n = makeNode({ id: 'rise', type: 'rise', data: { title: '', desc: '', group: '', baseDur: 120, restDur: 30, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } })
    expect(getNodeDuration(n)).toBe(150)
  })
})

describe('ScheduleManager — computeSchedule', () => {
  it('computes total span for linear graph', () => {
    const { span } = computeSchedule(linearGraph())
    // dough 20 + rise (120+30) + bake 30 = 200 min
    expect(span).toBe(200)
  })

  it('returns correct number of nodes', () => {
    const { nodes } = computeSchedule(linearGraph())
    expect(nodes).toHaveLength(3)
  })
})

describe('ScheduleManager — computeTimeSummary', () => {
  it('breaks down time by category', () => {
    const { nodes, span } = computeSchedule(linearGraph())
    const summary = computeTimeSummary(nodes, span)
    expect(summary.total).toBe(200)
    expect(summary.prep).toBe(20) // dough
    expect(summary.rise).toBe(150) // 120+30
    expect(summary.bake).toBe(30)
  })
})

describe('ScheduleManager — totalDuration', () => {
  it('returns span in minutes', () => {
    expect(totalDuration(linearGraph())).toBe(200)
  })
})
