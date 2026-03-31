import { describe, it, expect } from 'vitest'
import { llmVerificationResultSchema } from '../app/server/schemas/llm-verification'

describe('LlmVerificationResult schema', () => {
  it('validates a complete verification result', () => {
    const valid = {
      verifiedWarnings: [
        { warningId: 'w1', llmVerdict: 'confirmed', llmReason: 'Correct', suggestedAction: 0 },
        { warningId: 'w2', llmVerdict: 'dismissed', llmReason: 'Not relevant' },
      ],
      additionalInsights: [
        { category: 'hydration', severity: 'info', explanation: 'High hydration is fine for focaccia' },
      ],
      autoActions: [
        { warningId: 'w1', actionIndex: 0, confidence: 0.85 },
      ],
    }
    expect(() => llmVerificationResultSchema.parse(valid)).not.toThrow()
  })

  it('rejects invalid verdict', () => {
    const invalid = {
      verifiedWarnings: [{ warningId: 'w1', llmVerdict: 'invalid_value' }],
      additionalInsights: [],
      autoActions: [],
    }
    expect(() => llmVerificationResultSchema.parse(invalid)).toThrow()
  })

  it('rejects error severity in insights', () => {
    // The schema allows only 'info' and 'warning'
    const invalid = {
      verifiedWarnings: [],
      additionalInsights: [{ category: 'test', severity: 'error', explanation: 'bad' }],
      autoActions: [],
    }
    expect(() => llmVerificationResultSchema.parse(invalid)).toThrow()
  })

  it('validates empty result', () => {
    const empty = { verifiedWarnings: [], additionalInsights: [], autoActions: [] }
    expect(() => llmVerificationResultSchema.parse(empty)).not.toThrow()
  })

  it('rejects confidence > 1', () => {
    const invalid = {
      verifiedWarnings: [],
      additionalInsights: [],
      autoActions: [{ warningId: 'w1', actionIndex: 0, confidence: 1.5 }],
    }
    expect(() => llmVerificationResultSchema.parse(invalid)).toThrow()
  })
})
