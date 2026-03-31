import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OllamaProvider } from '../app/server/services/llm/ollama-provider'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('OllamaProvider', () => {
  let provider: OllamaProvider

  beforeEach(() => {
    mockFetch.mockReset()
    provider = new OllamaProvider({
      baseUrl: 'http://test:11434',
      model: 'qwen3.5:0.8b',
      maxTokens: 256,
      timeoutMs: 5000,
    })
  })

  describe('isAvailable', () => {
    it('returns true when model exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'qwen3.5:0.8b', size: 500000000 }] }),
      })
      expect(await provider.isAvailable()).toBe(true)
    })

    it('returns false when model not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3:8b', size: 500000000 }] }),
      })
      expect(await provider.isAvailable()).toBe(false)
    })

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      expect(await provider.isAvailable()).toBe(false)
    })
  })

  describe('generate', () => {
    it('returns generated text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Hello world' }),
      })
      const result = await provider.generate('Say hello')
      expect(result).toBe('Hello world')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test:11434/api/generate',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('returns null on error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
      expect(await provider.generate('test')).toBeNull()
    })

    it('returns null on timeout', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
      expect(await provider.generate('test')).toBeNull()
    })
  })

  describe('generateJSON', () => {
    it('returns parsed JSON matching schema', async () => {
      const schema = {
        parse: (v: unknown) => v as { name: string },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: '{"name": "test"}' }),
      })
      const result = await provider.generateJSON('test', schema)
      expect(result).toEqual({ name: 'test' })
    })

    it('sends format: json to Ollama', async () => {
      const schema = { parse: (v: unknown) => v }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: '{}' }),
      })
      await provider.generateJSON('test', schema)
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.format).toBe('json')
    })

    it('returns null on invalid JSON', async () => {
      const schema = { parse: () => { throw new Error('invalid') } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'not json' }),
      })
      expect(await provider.generateJSON('test', schema)).toBeNull()
    })
  })

  describe('listModels', () => {
    it('returns available models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'qwen3.5:0.8b', size: 500000000, modified_at: '2026-03-31' },
            { name: 'llama3:8b', size: 4000000000, modified_at: '2026-03-30' },
          ],
        }),
      })
      const models = await provider.listModels()
      expect(models).toHaveLength(2)
      expect(models[0].name).toBe('qwen3.5:0.8b')
    })

    it('returns empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'))
      expect(await provider.listModels()).toEqual([])
    })
  })

  describe('runtime config', () => {
    it('getModel returns current model', () => {
      expect(provider.getModel()).toBe('qwen3.5:0.8b')
    })

    it('setModel updates model', () => {
      provider.setModel('llama3:8b')
      expect(provider.getModel()).toBe('llama3:8b')
    })
  })
})
