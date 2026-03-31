import type { RecipeEdgeData } from '@commons/types/recipe-graph'

export interface ScheduleResult {
  entries: ScheduleEntry[]
  totalSpan: number // minutes
  criticalPath: string[]
}

export interface ScheduleEntry {
  nodeId: string
  start: Date
  end: Date
  duration: number // minutes
  lane: string
  layerId: string
}

export interface TimeSlot {
  day: number // 0-6 (Sun-Sat)
  startHour: number
  endHour: number
  available: boolean
}

export interface CrossEdgeStub {
  localNodeId: string
  externalLayerId: string
  externalNodeId: string
  direction: 'in' | 'out'
  edgeData: RecipeEdgeData
}

export interface CrossEdgeMapping {
  sourceNodeId: string
  targetNodeId: string
  edgeData?: Partial<RecipeEdgeData>
}

export interface PathOpts {
  notThrough?: Set<string>
  maxHops?: number
}
