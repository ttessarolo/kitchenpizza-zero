/**
 * ScienceProvider — Abstract interface for loading CookingScienceBrain JSON blocks.
 *
 * Today: FileScienceProvider reads from /science/ directory.
 * Tomorrow: DbScienceProvider reads from Neon PostgreSQL.
 */

import type {
  ScienceBlock,
  FormulaBlock,
  FactorChainBlock,
  PiecewiseBlock,
  ClassificationBlock,
  RuleBlock,
} from './types'

// ── Provider interface ─────────────────────────────────────────

export interface ScienceProvider {
  // Read — formulas
  getFormula(id: string): FormulaBlock
  getFactorChain(id: string): FactorChainBlock
  getPiecewise(id: string): PiecewiseBlock

  // Read — rules & classification
  getRules(domain: string): RuleBlock[]
  getClassification(id: string): ClassificationBlock

  // Read — data
  getCatalog(name: string): Record<string, unknown>[]
  getDefaults(id: string, type: string, subtype: string | null): Record<string, unknown>

  // Read — all (for admin)
  listAll(): ScienceBlock[]
  getBlock(id: string): ScienceBlock | null

  // Write (for admin)
  saveBlock(block: ScienceBlock): void

  // i18n
  getI18nKeys(locale: string): Record<string, string>
  saveI18nKey(locale: string, key: string, value: string): void
}

// ── File-based provider ────────────────────────────────────────

import * as fs from 'fs'
import * as path from 'path'

export class FileScienceProvider implements ScienceProvider {
  private blocks: Map<string, ScienceBlock> = new Map()
  private rulesByDomain: Map<string, RuleBlock[]> = new Map()
  private catalogs: Map<string, Record<string, unknown>[]> = new Map()
  private i18nCache: Map<string, Record<string, string>> = new Map()

  constructor(
    private scienceDir: string,
    private i18nDir: string,
  ) {
    this.loadAll()
  }

  private loadAll(): void {
    this.blocks.clear()
    this.rulesByDomain.clear()
    this.catalogs.clear()
    this.i18nCache.clear()

    const dirs = ['formulas', 'rules', 'catalogs', 'defaults', 'classifications']
    for (const dir of dirs) {
      const dirPath = path.join(this.scienceDir, dir)
      if (!fs.existsSync(dirPath)) continue
      for (const file of fs.readdirSync(dirPath)) {
        if (!file.endsWith('.json')) continue
        const filePath = path.join(dirPath, file)
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        // A file can contain a single block or an array of blocks
        const blocks: ScienceBlock[] = Array.isArray(content) ? content : [content]
        for (const block of blocks) {
          this.blocks.set(block.id, block)

          // Index rules by section/category for fast lookup
          if (block.type === 'rule') {
            const domain = block._meta?.section ?? block.category
            if (!this.rulesByDomain.has(domain)) this.rulesByDomain.set(domain, [])
            this.rulesByDomain.get(domain)!.push(block)
          }

          // Index catalogs
          if (block.type === 'catalog') {
            this.catalogs.set(block.id, block.entries)
          }
        }
      }
    }
  }

  // ── Read API ──────────────────────────────────────────────────

  getFormula(id: string): FormulaBlock {
    const block = this.blocks.get(id)
    if (!block || block.type !== 'formula') throw new Error(`Formula "${id}" not found`)
    return block
  }

  getFactorChain(id: string): FactorChainBlock {
    const block = this.blocks.get(id)
    if (!block || block.type !== 'factor_chain') throw new Error(`Factor chain "${id}" not found`)
    return block
  }

  getPiecewise(id: string): PiecewiseBlock {
    const block = this.blocks.get(id)
    if (!block || block.type !== 'piecewise') throw new Error(`Piecewise "${id}" not found`)
    return block
  }

  getRules(domain: string): RuleBlock[] {
    // Return rules for a specific domain, or all rules if domain is '*'
    if (domain === '*') {
      const all: RuleBlock[] = []
      for (const rules of this.rulesByDomain.values()) all.push(...rules)
      return all
    }
    return this.rulesByDomain.get(domain) ?? []
  }

  getClassification(id: string): ClassificationBlock {
    const block = this.blocks.get(id)
    if (!block || block.type !== 'classification') throw new Error(`Classification "${id}" not found`)
    return block
  }

  getCatalog(name: string): Record<string, unknown>[] {
    return this.catalogs.get(name) ?? []
  }

  getDefaults(id: string, type: string, subtype: string | null): Record<string, unknown> {
    const block = this.blocks.get(id)
    if (!block || block.type !== 'defaults') return {}

    // Fallback chain: exact match → type-level → catch-all
    const exact = block.entries.find((e) => e.type === type && e.subtype === subtype)
    if (exact) return exact
    const typeLevel = block.entries.find((e) => e.type === type && (e.subtype === null || e.subtype === undefined))
    if (typeLevel) return typeLevel
    return block.entries[block.entries.length - 1] ?? {}
  }

  // ── Admin API ─────────────────────────────────────────────────

  listAll(): ScienceBlock[] {
    return Array.from(this.blocks.values())
  }

  getBlock(id: string): ScienceBlock | null {
    return this.blocks.get(id) ?? null
  }

  saveBlock(block: ScienceBlock): void {
    // Determine file path from block type
    const dirMap: Record<string, string> = {
      formula: 'formulas',
      factor_chain: 'formulas',
      piecewise: 'classifications',
      classification: 'classifications',
      rule: 'rules',
      catalog: 'catalogs',
      defaults: 'defaults',
    }
    const dir = dirMap[block.type] ?? 'formulas'
    const filePath = path.join(this.scienceDir, dir, `${block.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(block, null, 2), 'utf-8')

    // Reload to update indexes
    this.blocks.set(block.id, block)
  }

  // ── i18n API ──────────────────────────────────────────────────

  getI18nKeys(locale: string): Record<string, string> {
    if (this.i18nCache.has(locale)) return this.i18nCache.get(locale)!
    const filePath = path.join(this.i18nDir, locale, 'science.json')
    if (!fs.existsSync(filePath)) return {}
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    this.i18nCache.set(locale, data)
    return data
  }

  saveI18nKey(locale: string, key: string, value: string): void {
    const filePath = path.join(this.i18nDir, locale, 'science.json')
    const data = this.getI18nKeys(locale)
    data[key] = value
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    this.i18nCache.set(locale, data)
  }
}
