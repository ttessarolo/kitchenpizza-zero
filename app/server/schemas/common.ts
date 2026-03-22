import { z } from 'zod'

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

export const idSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z.object({
  message: z.string(),
})

export const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
})
