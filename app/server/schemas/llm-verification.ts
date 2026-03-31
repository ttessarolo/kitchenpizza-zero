import { z } from 'zod'

export const llmVerifiedWarningSchema = z.object({
  warningId: z.string(),
  llmVerdict: z.enum(['confirmed', 'downgraded', 'upgraded', 'dismissed']),
  llmReason: z.string().optional(),
  suggestedAction: z.number().nullable().optional(),
})

export const llmInsightSchema = z.object({
  category: z.string(),
  severity: z.enum(['info', 'warning']),
  explanation: z.string(),
})

export const llmAutoActionSchema = z.object({
  warningId: z.string(),
  actionIndex: z.number(),
  confidence: z.number().min(0).max(1),
})

export const llmVerificationResultSchema = z.object({
  verifiedWarnings: z.array(llmVerifiedWarningSchema),
  additionalInsights: z.array(llmInsightSchema),
  autoActions: z.array(llmAutoActionSchema),
})

export type LlmVerificationResult = z.infer<typeof llmVerificationResultSchema>
export type LlmVerifiedWarning = z.infer<typeof llmVerifiedWarningSchema>
export type LlmInsight = z.infer<typeof llmInsightSchema>
export type LlmAutoAction = z.infer<typeof llmAutoActionSchema>
