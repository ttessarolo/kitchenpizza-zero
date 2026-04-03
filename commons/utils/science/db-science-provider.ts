/**
 * DbScienceProvider — Neon PostgreSQL-backed ScienceProvider.
 *
 * Reads all science blocks from the `science_blocks` table in a dedicated
 * Neon project (cooking-science-brain). Loads everything into memory on init(),
 * then serves reads synchronously — same pattern as FileScienceProvider.
 */

import { neon } from '@neondatabase/serverless'
import type { ScienceProvider } from './science-provider'
import type {
  ScienceBlock,
  FormulaBlock,
  FactorChainBlock,
  PiecewiseBlock,
  ClassificationBlock,
  RuleBlock,
  BlendFormulaBlock,
  MultiNodeConstraintBlock,
} from './types'

export class DbScienceProvider implements ScienceProvider {
  private blocks: Map<string, ScienceBlock> = new Map()
  private rulesByDomain: Map<string, RuleBlock[]> = new Map()
  private catalogs: Map<string, Record<string, unknown>[]> = new Map()
  private i18nCache: Map<string, Record<string, string>> = new Map()
  private sql: ReturnType<typeof neon>

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl)
  }

  // ── Initialization ────────────────────────────────────────────

  async init(): Promise<void> {
    const rows = await this.sql`SELECT id, type, domain, title, data FROM science_blocks WHERE status = 'active'` as Record<string, unknown>[]
    this.blocks.clear()
    this.rulesByDomain.clear()
    this.catalogs.clear()

    for (const row of rows) {
      const data = row.data
      // Some rows contain arrays of blocks in data (e.g. formula/composition)
      const items: ScienceBlock[] = Array.isArray(data) ? data : [data]
      for (const block of items) {
        if (!block || !block.id) continue
        // Merge SQL-level title into the block for admin UI access
        if (row.title) (block as any).title = row.title as string
        this.blocks.set(block.id, block)

        // Index rules by domain/section
        if (block.type === 'rule') {
          const domain = (block as any)._meta?.section ?? (block as any).category
          if (!this.rulesByDomain.has(domain)) this.rulesByDomain.set(domain, [])
          this.rulesByDomain.get(domain)!.push(block as RuleBlock)
        }

        // Index catalogs
        if (block.type === 'catalog') {
          this.catalogs.set(block.id, (block as any).entries)
        }
      }
    }
  }

  /** Reload all data from the database. */
  async reload(): Promise<void> {
    return this.init()
  }

  // ── Read API — formulas ───────────────────────────────────────

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

  // ── Read API — rules & classification ─────────────────────────

  getRules(domain: string): RuleBlock[] {
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

  // ── Read API — specialized blocks ─────────────────────────────

  getBlendFormula(id: string): BlendFormulaBlock {
    const block = this.blocks.get(id)
    if (!block || block.type !== 'blend_formula') throw new Error(`Blend formula "${id}" not found`)
    return block
  }

  getMultiNodeConstraint(id: string): MultiNodeConstraintBlock {
    const block = this.blocks.get(id)
    if (!block || block.type !== 'multi_node_constraint') throw new Error(`Multi-node constraint "${id}" not found`)
    return block
  }

  // ── Read API — data ───────────────────────────────────────────

  getCatalog(name: string): Record<string, unknown>[] {
    return this.catalogs.get(name) ?? []
  }

  getDefaults(id: string, type: string, subtype: string | null): Record<string, unknown> {
    const block = this.blocks.get(id)
    if (!block || block.type !== 'defaults') return {}

    const entries = (block as any).entries as Record<string, unknown>[]
    // Fallback chain: exact match → type-level → catch-all
    const exact = entries.find((e: any) => e.type === type && e.subtype === subtype)
    if (exact) return exact
    const typeLevel = entries.find((e: any) => e.type === type && (e.subtype === null || e.subtype === undefined))
    if (typeLevel) return typeLevel
    return entries[entries.length - 1] ?? {}
  }

  // ── Admin API ─────────────────────────────────────────────────

  listAll(): ScienceBlock[] {
    return Array.from(this.blocks.values())
  }

  getBlock(id: string): ScienceBlock | null {
    return this.blocks.get(id) ?? null
  }

  saveBlock(block: ScienceBlock): void {
    // Determine DB row id from block metadata
    const typeToDir: Record<string, string> = {
      formula: 'formula',
      factor_chain: 'formula',
      piecewise: 'classification',
      classification: 'classification',
      rule: 'rule',
      catalog: 'catalog',
      defaults: 'defaults',
      blend_formula: 'formula',
      multi_node_constraint: 'constraint',
    }
    const prefix = typeToDir[block.type] ?? 'formula'
    const dbId = `${prefix}/${block.id}`

    // Upsert to DB (fire-and-forget — the async write happens in background)
    const data = JSON.stringify(block)
    const domain = (block as any)._meta?.section ?? (block as any).category ?? 'unknown'
    this.sql`
      INSERT INTO science_blocks (id, type, domain, data, status, version, updated_at)
      VALUES (${dbId}, ${block.type}, ${domain}, ${data}::jsonb, 'active', 1, now())
      ON CONFLICT (id) DO UPDATE SET
        data = ${data}::jsonb,
        updated_at = now(),
        version = science_blocks.version + 1
    `.catch(() => { /* log error in production */ })

    // Update in-memory index
    this.blocks.set(block.id, block)
  }

  // ── i18n API ──────────────────────────────────────────────────

  getI18nKeys(locale: string): Record<string, string> {
    // Return cached synchronously; async load happens via loadI18n()
    return this.i18nCache.get(locale) ?? {}
  }

  /** Load i18n keys for a locale from the database. Call before getI18nKeys(). */
  async loadI18n(locale: string): Promise<Record<string, string>> {
    const rows = await this.sql`SELECT key, value FROM science_i18n WHERE locale = ${locale}` as Record<string, unknown>[]
    const data: Record<string, string> = {}
    for (const row of rows) {
      data[row.key as string] = row.value as string
    }
    this.i18nCache.set(locale, data)
    return data
  }

  saveI18nKey(locale: string, key: string, value: string): void {
    this.sql`
      INSERT INTO science_i18n (locale, key, value) VALUES (${locale}, ${key}, ${value})
      ON CONFLICT (locale, key) DO UPDATE SET value = ${value}
    `.catch(() => { /* log error in production */ })

    // Update cache
    const cache = this.i18nCache.get(locale) ?? {}
    cache[key] = value
    this.i18nCache.set(locale, cache)
  }
}
