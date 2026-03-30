/**
 * Generate a layer graph from a template or generator.
 *
 * For impasto layers, delegates to generateDoughGraph().
 * For declarative templates, instantiates the template into a real graph.
 */

import type { RecipeGraph, RecipeNode, RecipeEdge } from '@commons/types/recipe-graph'
import type { RecipeMeta } from '@commons/types/recipe'
import type { MasterConfig } from '@commons/types/recipe-layers'
import {
  type TemplateEntry,
  type LayerTemplate,
  isGeneratorSentinel,
} from '@commons/constants/layer-templates'
import { generateDoughGraph } from './generate-dough'
import { autoLayout } from './auto-layout'

let tplIdCounter = 0
function tplUid(prefix: string) {
  return `${prefix}_tpl_${(++tplIdCounter).toString(36)}_${Date.now().toString(36)}`
}

interface GenerateLayerOptions {
  template: TemplateEntry
  layerType: string
  subtype: string
  variant: string
  masterConfig: MasterConfig
  meta: RecipeMeta
  t: (key: string, vars?: Record<string, unknown>) => string
}

/**
 * Generate a node graph for a layer.
 * Returns null if the template is declarative but has no nodes (shouldn't happen).
 */
export function generateLayerGraph(opts: GenerateLayerOptions): RecipeGraph | null {
  const { template, masterConfig, meta, t } = opts
  tplIdCounter = 0

  // Impasto: delegate to the procedural generator
  if (isGeneratorSentinel(template)) {
    const portioning = masterConfig.type === 'impasto'
      ? masterConfig.config
      : null
    if (!portioning) return null

    const totalDough = portioning.mode === 'tray'
      ? Math.round(portioning.thickness * portioning.tray.l * portioning.tray.w * portioning.tray.count)
      : portioning.ball.weight * portioning.ball.count

    return generateDoughGraph({ meta, portioning, totalDough, t })
  }

  // Declarative template
  return instantiateTemplate(template, t)
}

function instantiateTemplate(
  tpl: LayerTemplate,
  t: (key: string) => string,
): RecipeGraph {
  const nodes: RecipeNode[] = tpl.nodes.map((def) => ({
    id: tplUid(def.type),
    type: def.type as RecipeNode['type'],
    subtype: def.subtype ?? null,
    position: { x: 0, y: 0 },
    lane: 'main',
    data: {
      title: t(def.titleKey),
      desc: '',
      group: '',
      baseDur: def.baseDur,
      restDur: 0,
      restTemp: null,
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      salts: [],
      sugars: [],
      fats: [],
    },
  }))

  const edges: RecipeEdge[] = tpl.edges.map((def) => ({
    id: `e_${nodes[def.fromIndex].id}__${nodes[def.toIndex].id}`,
    source: nodes[def.fromIndex].id,
    target: nodes[def.toIndex].id,
    sourceHandle: null,
    targetHandle: null,
    data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
  }))

  const graph: RecipeGraph = { nodes, edges, lanes: [] }
  return autoLayout(graph)
}
