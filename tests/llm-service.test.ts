import { describe, it, expect } from 'vitest'
import { NoopProvider } from '../app/server/services/llm/noop-provider'

describe('NoopProvider', () => {
  const provider = new NoopProvider()

  it('isAvailable returns false', async () => {
    expect(await provider.isAvailable()).toBe(false)
  })

  it('generate returns null', async () => {
    expect(await provider.generate('test prompt')).toBeNull()
  })

  it('generateJSON returns null', async () => {
    const schema = { parse: (v: unknown) => v as string }
    expect(await provider.generateJSON('test', schema)).toBeNull()
  })
})
