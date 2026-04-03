import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the openai module
const mockCreate = vi.fn()
const mockRetrieve = vi.fn()

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } }
      models = { retrieve: mockRetrieve }
      constructor() {}
    },
  }
})

import { OpenAiProvider } from '../app/server/services/llm/openai-provider'

describe('OpenAiProvider', () => {
  let provider: OpenAiProvider

  beforeEach(() => {
    mockCreate.mockReset()
    mockRetrieve.mockReset()
    provider = new OpenAiProvider({
      apiKey: 'test-key',
      model: 'gpt-5.4-mini',
      maxTokens: 1024,
      timeoutMs: 5000,
    })
  })

  describe('isAvailable', () => {
    it('returns true when model exists', async () => {
      mockRetrieve.mockResolvedValueOnce({ id: 'gpt-5.4-mini' })
      expect(await provider.isAvailable()).toBe(true)
      expect(mockRetrieve).toHaveBeenCalledWith('gpt-5.4-mini')
    })

    it('returns false on API error', async () => {
      mockRetrieve.mockRejectedValueOnce(new Error('Not found'))
      expect(await provider.isAvailable()).toBe(false)
    })
  })

  describe('generate', () => {
    it('returns generated text', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Hello world' } }],
      })
      const result = await provider.generate('Say hello')
      expect(result).toBe('Hello world')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5.4-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Say hello' }),
          ]),
        }),
      )
    })

    it('uses custom temperature and maxTokens', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'test' } }],
      })
      await provider.generate('test', { maxTokens: 100, temperature: 0.8 })
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_completion_tokens: 100,
          temperature: 0.8,
        }),
      )
    })

    it('returns null on error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API error'))
      expect(await provider.generate('test')).toBeNull()
    })

    it('returns null when no content in response', async () => {
      mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: null } }] })
      expect(await provider.generate('test')).toBeNull()
    })
  })

  describe('generateJSON', () => {
    it('returns parsed JSON matching schema', async () => {
      const schema = {
        parse: (v: unknown) => v as { name: string },
      }
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{"name": "test"}' } }],
      })
      const result = await provider.generateJSON('test', schema)
      expect(result).toEqual({ name: 'test' })
    })

    it('sends response_format json_object', async () => {
      const schema = { parse: (v: unknown) => v }
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{}' } }],
      })
      await provider.generateJSON('test', schema)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      )
    })

    it('returns null on invalid JSON', async () => {
      const schema = { parse: () => { throw new Error('invalid') } }
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'not json' } }],
      })
      expect(await provider.generateJSON('test', schema)).toBeNull()
    })

    it('returns null when no content', async () => {
      const schema = { parse: (v: unknown) => v }
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      })
      expect(await provider.generateJSON('test', schema)).toBeNull()
    })

    it('returns null on API error', async () => {
      const schema = { parse: (v: unknown) => v }
      mockCreate.mockRejectedValueOnce(new Error('API error'))
      expect(await provider.generateJSON('test', schema)).toBeNull()
    })
  })

  describe('getModel', () => {
    it('returns current model', () => {
      expect(provider.getModel()).toBe('gpt-5.4-mini')
    })
  })
})
