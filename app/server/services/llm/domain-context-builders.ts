/**
 * Domain Context Builders — strategy registry for building domain-specific
 * LLM prompt context from RecipeLayer data.
 *
 * Each builder extracts "global values" and "process phases" relevant to
 * its domain, formatted as human-readable text for the LLM.
 */

import type { RecipeLayer } from '@commons/types/recipe-layers'
import type { RecipeNode } from '@commons/types/recipe-graph'

export interface DomainContext {
  /** Key metrics for this domain (e.g. "hyd=65%, yeast=0.22%, salt=2.3%") */
  globalValues: string
  /** Ordered list of process phases from the node graph */
  processPhases: string
  /** Additional domain-specific info (e.g. flour blend, brine details) */
  supplementary: string
}

export type DomainContextBuilder = (layer: RecipeLayer) => DomainContext

// ── Registry ─────────────────────────────────────────────────────

const builders = new Map<string, DomainContextBuilder>()

export function registerDomainContextBuilder(domainKey: string, builder: DomainContextBuilder): void {
  builders.set(domainKey, builder)
}

export function getDomainContextBuilder(domainKey: string): DomainContextBuilder {
  return builders.get(domainKey) ?? fallbackBuilder
}

// ── Helpers ──────────────────────────────────────────────────────

function nodeData(n: RecipeNode): Record<string, unknown> {
  return n.data as Record<string, unknown>
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.round(minutes / 60 * 10) / 10
  return `${h}h (${minutes}min)`
}

function buildGenericPhases(nodes: RecipeNode[]): string {
  return nodes.map((n, i) => {
    const d = nodeData(n)
    const parts: string[] = [`${i + 1}. [${n.type}] "${d.title ?? n.type}"`]
    if (typeof d.baseDur === 'number') parts.push(formatDuration(d.baseDur))
    return parts.join(' — ')
  }).join('\n') || '(no phases)'
}

// ── Impasto builder ──────────────────────────────────────────────

function impastoBuilder(layer: RecipeLayer): DomainContext {
  const cfg = layer.masterConfig.type === 'impasto' ? layer.masterConfig.config : null
  const nodes = layer.nodes

  // Global values
  const gv: string[] = []
  if (cfg) {
    gv.push(`hyd=${cfg.targetHyd}%`)
    gv.push(`yeast=${cfg.yeastPct}%`)
    gv.push(`salt=${cfg.saltPct}%`)
    gv.push(`fat=${cfg.fatPct}%`)
    gv.push(`doughHours=${cfg.doughHours}h`)
    if (cfg.preImpasto) gv.push(`preTechnique=${cfg.preImpasto}`)
    if (cfg.preFermento) gv.push(`preFerment=${cfg.preFermento}`)
  }

  // Process phases — dough-aware
  const phases = nodes.map((n, i) => {
    const d = nodeData(n)
    const parts: string[] = [`${i + 1}. [${n.type}] "${d.title ?? n.type}"`]
    if (typeof d.baseDur === 'number') parts.push(formatDuration(d.baseDur))

    if (n.type === 'rise') {
      if (d.riseMethod) parts.push(`method=${d.riseMethod}`)
      if (d.userOverrideDuration) parts.push('userOverride=true')
    } else if (n.type === 'bake') {
      const bCfg = d.cookingCfg as Record<string, unknown> | null
      if (bCfg) {
        parts.push(`cookMethod=${bCfg.method}`)
        const inner = bCfg.cfg as Record<string, unknown> | null
        if (inner?.temp) parts.push(`temp=${inner.temp}°C`)
        if (inner?.ovenMode) parts.push(`mode=${inner.ovenMode}`)
        if (inner?.steamPct) parts.push(`steam=${inner.steamPct}%`)
      }
    } else if (n.type === 'dough' || n.type === 'mix') {
      if (d.kneadMethod) parts.push(`knead=${d.kneadMethod}`)
      const flours = d.flours as Array<Record<string, unknown>> | undefined
      if (flours) parts.push(`${flours.length} flours`)
    } else if (n.type === 'shape') {
      if (d.shapeCount) parts.push(`count=${d.shapeCount}`)
    } else if (n.type === 'pre_ferment') {
      const pfCfg = d.preFermentCfg as Record<string, unknown> | null
      if (pfCfg) {
        parts.push(`type=${pfCfg.type}`)
        if (pfCfg.pct) parts.push(`pct=${pfCfg.pct}%`)
        if (pfCfg.hydration) parts.push(`hyd=${pfCfg.hydration}%`)
      }
    }

    return parts.join(', ')
  }).join('\n') || '(no phases)'

  // Supplementary — flour blend info
  const supplementaryLines: string[] = []
  const doughNodes = nodes.filter(n => n.type === 'dough' || n.type === 'mix')
  for (const n of doughNodes) {
    const d = nodeData(n)
    const flourBlend = d.flourBlend as Array<{ flourId?: string; pct?: number; w?: number; protein?: number }> | undefined
    if (flourBlend && flourBlend.length > 0) {
      for (const f of flourBlend) {
        supplementaryLines.push(`${n.id}: ${f.flourId ?? 'unknown'} ${f.pct ?? 0}% — W${f.w ?? '?'}${f.protein ? `, protein ${f.protein}%` : ''}`)
      }
      const totalPct = flourBlend.reduce((a, f) => a + (f.pct ?? 0), 0)
      if (totalPct > 0) {
        const avgW = flourBlend.reduce((a, f) => a + (f.w ?? 0) * (f.pct ?? 0), 0) / totalPct
        supplementaryLines.push(`Blend average W: ${Math.round(avgW)}`)
        gv.push(`W=${Math.round(avgW)}`)
      }
    } else {
      const flours = d.flours as Array<Record<string, unknown>> | undefined
      if (flours && flours.length > 0) {
        supplementaryLines.push(`${n.id}: ${flours.length} flours (no W data in blend)`)
      }
    }
  }

  return {
    globalValues: gv.join(', ') || 'N/A',
    processPhases: phases,
    supplementary: supplementaryLines.length > 0
      ? `Flour blend:\n${supplementaryLines.join('\n')}`
      : '',
  }
}

// ── Sauce builder ────────────────────────────────────────────────

function sauceBuilder(layer: RecipeLayer): DomainContext {
  const cfg = layer.masterConfig.type === 'sauce' ? layer.masterConfig.config : null

  const gv: string[] = []
  if (cfg) {
    gv.push(`sauceType=${cfg.sauceType}`)
    gv.push(`targetVolume=${cfg.targetVolume}ml`)
    gv.push(`consistency=${cfg.targetConsistency}`)
    gv.push(`serving=${cfg.serving}`)
    gv.push(`shelfLife=${cfg.shelfLife}d`)
  }

  return {
    globalValues: gv.join(', ') || 'N/A',
    processPhases: buildGenericPhases(layer.nodes),
    supplementary: '',
  }
}

// ── Prep builder ─────────────────────────────────────────────────

function prepBuilder(layer: RecipeLayer): DomainContext {
  const cfg = layer.masterConfig.type === 'prep' ? layer.masterConfig.config : null

  const gv: string[] = []
  if (cfg) {
    gv.push(`prepType=${cfg.prepType}`)
    gv.push(`servings=${cfg.servings}`)
    gv.push(`yield=${cfg.yield}g`)
  }

  return {
    globalValues: gv.join(', ') || 'N/A',
    processPhases: buildGenericPhases(layer.nodes),
    supplementary: '',
  }
}

// ── Ferment builder ──────────────────────────────────────────────

function fermentBuilder(layer: RecipeLayer): DomainContext {
  const cfg = layer.masterConfig.type === 'ferment' ? layer.masterConfig.config : null

  const gv: string[] = []
  if (cfg) {
    gv.push(`fermentType=${cfg.fermentType}`)
    gv.push(`salt=${cfg.saltPercentage}%`)
    gv.push(`targetPH=${cfg.targetPH}`)
    gv.push(`temp=${cfg.temperature}°C`)
    gv.push(`duration=${cfg.duration}h`)
    gv.push(`vessel=${cfg.vessel}`)
  }

  return {
    globalValues: gv.join(', ') || 'N/A',
    processPhases: buildGenericPhases(layer.nodes),
    supplementary: '',
  }
}

// ── Pastry builder ───────────────────────────────────────────────

function pastryBuilder(layer: RecipeLayer): DomainContext {
  const cfg = layer.masterConfig.type === 'pastry' ? layer.masterConfig.config : null

  const gv: string[] = []
  if (cfg) {
    gv.push(`pastryType=${cfg.pastryType}`)
    gv.push(`targetWeight=${cfg.targetWeight}g`)
    gv.push(`servings=${cfg.servings}`)
    if (cfg.temperatureNotes) gv.push(`tempNotes=${cfg.temperatureNotes}`)
  }

  return {
    globalValues: gv.join(', ') || 'N/A',
    processPhases: buildGenericPhases(layer.nodes),
    supplementary: '',
  }
}

// ── Fallback builder (generic) ───────────────────────────────────

function fallbackBuilder(layer: RecipeLayer): DomainContext {
  const cfg = layer.masterConfig.config as unknown as Record<string, unknown>
  const gv = Object.entries(cfg)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')

  return {
    globalValues: gv || 'N/A',
    processPhases: buildGenericPhases(layer.nodes),
    supplementary: '',
  }
}

// ── Register all built-in builders ───────────────────────────────

registerDomainContextBuilder('impasto', impastoBuilder)
registerDomainContextBuilder('sauce', sauceBuilder)
registerDomainContextBuilder('prep', prepBuilder)
registerDomainContextBuilder('ferment', fermentBuilder)
registerDomainContextBuilder('pastry', pastryBuilder)
