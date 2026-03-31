export interface FeatureFlags {
  USE_V2_RECONCILER: boolean
  LLM_ENABLED: boolean
  LLM_PROVIDER: 'hf_api' | 'local' | 'noop'
}

export function getFlags(): FeatureFlags {
  return {
    USE_V2_RECONCILER: process.env.USE_V2_RECONCILER === 'true',
    LLM_ENABLED: process.env.LLM_ENABLED === 'true',
    LLM_PROVIDER:
      (process.env.LLM_PROVIDER as FeatureFlags['LLM_PROVIDER']) || 'noop',
  }
}
