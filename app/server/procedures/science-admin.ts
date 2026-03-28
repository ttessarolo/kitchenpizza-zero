/**
 * Science admin procedures — CRUD for science blocks and i18n keys.
 * Protected by authProcedure (admin role check is at route level).
 */

import { z } from 'zod'
import { authProcedure } from '../middleware/auth'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import * as path from 'path'

// Singleton provider (reused across requests)
const scienceDir = path.resolve(process.cwd(), 'science')
const i18nDir = path.resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

// ── List all science blocks ────────────────────────────────────

export const listBlocks = authProcedure
  .output(z.object({
    blocks: z.array(z.object({
      id: z.string(),
      type: z.string(),
      _meta: z.object({
        section: z.string(),
        displayName: z.string(),
        description: z.string(),
        tags: z.array(z.string()),
        lastModified: z.string().optional(),
        author: z.string().optional(),
      }).optional(),
    })),
  }))
  .handler(async () => {
    const all = provider.listAll()
    return {
      blocks: all.map((b) => ({
        id: b.id,
        type: b.type,
        _meta: b._meta,
      })),
    }
  })

// ── Get single block ───────────────────────────────────────────

export const getBlock = authProcedure
  .input(z.object({ id: z.string() }))
  .output(z.object({ block: z.record(z.string(), z.unknown()).nullable() }))
  .handler(async ({ input }) => ({
    block: provider.getBlock(input.id) as any,
  }))

// ── Update block ───────────────────────────────────────────────

export const updateBlock = authProcedure
  .input(z.object({
    block: z.record(z.string(), z.unknown()),
  }))
  .output(z.object({ success: z.boolean() }))
  .handler(async ({ input }) => {
    provider.saveBlock(input.block as any)
    return { success: true }
  })

// ── List i18n keys ─────────────────────────────────────────────

export const listI18n = authProcedure
  .input(z.object({ locale: z.string() }))
  .output(z.object({ keys: z.record(z.string(), z.string()) }))
  .handler(async ({ input }) => ({
    keys: provider.getI18nKeys(input.locale),
  }))

// ── Update i18n key ────────────────────────────────────────────

export const updateI18n = authProcedure
  .input(z.object({
    locale: z.string(),
    key: z.string(),
    value: z.string(),
  }))
  .output(z.object({ success: z.boolean() }))
  .handler(async ({ input }) => {
    provider.saveI18nKey(input.locale, input.key, input.value)
    return { success: true }
  })
