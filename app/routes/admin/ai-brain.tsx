import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useMemo, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { useT } from '~/hooks/useTranslation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select'

// ── Server functions ────────────────────────────────────────
import { getFlags } from '~/server/lib/feature-flags'
import { getCurrentProvider, resetLlmProvider } from '~/server/services/llm/llm-service'
import { OllamaProvider } from '~/server/services/llm/ollama-provider'
import { getAllPrompts, getPromptTemplate, updatePrompt as updatePromptStore, resetPrompt as resetPromptStore, fillTemplate } from '~/server/services/llm/prompt-store'
import { llmService } from '~/server/services/llm/llm-service'

const loadAiBrainData = createServerFn().handler(async () => {
  const flags = getFlags()
  const config = {
    enabled: flags.LLM_ENABLED,
    provider: flags.LLM_PROVIDER,
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen3.5:0.8b',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '512', 10),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10),
  }
  const prompts = getAllPrompts()
  return { config, prompts }
})

const serverTestConnection = createServerFn().handler(async () => {
  const start = Date.now()
  const provider = getCurrentProvider()
  const available = await provider.isAvailable()
  const latencyMs = Date.now() - start
  let models: Array<{ name: string; size: number; modified_at: string }> = []
  let currentModel = process.env.OLLAMA_MODEL || 'qwen3.5:0.8b'
  if (provider instanceof OllamaProvider) {
    models = await provider.listModels()
    currentModel = provider.getModel()
  }
  return { available, models, currentModel, latencyMs }
})

const serverUpdatePrompt = (createServerFn() as any)
  .handler(async ({ data }: { data: { key: string; template: string } }) => {
    return updatePromptStore(data.key, data.template)
  })

const serverResetPrompt = (createServerFn() as any)
  .handler(async ({ data }: { data: { key: string } }) => {
    return resetPromptStore(data.key)
  })

const serverTestPrompt = (createServerFn() as any)
  .handler(async ({ data }: { data: { key: string; variables: Record<string, string> } }) => {
    const template = getPromptTemplate(data.key)
    if (!template) return { output: null, latencyMs: 0, source: 'fallback' as const }
    const prompt = fillTemplate(template, data.variables)
    const start = Date.now()
    const output = await llmService.generate(prompt)
    const latencyMs = Date.now() - start
    return { output, latencyMs, source: output ? 'llm' as const : 'fallback' as const }
  })

export const Route = createFileRoute('/admin/ai-brain')({
  loader: () => loadAiBrainData(),
  component: AiBrainPage,
})

// ── Helpers ────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const CATEGORIES = ['explanation', 'constraint', 'compatibility', 'verification'] as const

// ── Page ───────────────────────────────────────────────────────

function AiBrainPage() {
  const t = useT()
  const { config, prompts: initialPrompts } = Route.useLoaderData()
  const [prompts, setPrompts] = useState(initialPrompts)
  const [connResult, setConnResult] = useState<{ available: boolean; models: any[]; currentModel: string; latencyMs: number } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ output: string | null; latencyMs: number; source: string } | null>(null)
  const [isTestingPrompt, setIsTestingPrompt] = useState(false)

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true)
    try {
      const result = await serverTestConnection()
      setConnResult(result)
    } catch { /* ignore */ }
    setIsTesting(false)
  }, [])

  const handleUpdatePrompt = useCallback(async (key: string, template: string) => {
    const updated = await serverUpdatePrompt({ data: { key, template } })
    if (updated) setPrompts(prev => prev.map(p => p.key === key ? { ...p, ...updated } : p))
  }, [])

  const handleResetPrompt = useCallback(async (key: string) => {
    const updated = await serverResetPrompt({ data: { key } })
    if (updated) setPrompts(prev => prev.map(p => p.key === key ? { ...p, ...updated } : p))
  }, [])

  const handleTestPrompt = useCallback(async (key: string, variables: Record<string, string>) => {
    setIsTestingPrompt(true)
    try {
      const result = await serverTestPrompt({ data: { key, variables } })
      setTestResult(result)
    } catch { /* ignore */ }
    setIsTestingPrompt(false)
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          {t('admin.ai.title')}
        </h2>
      </div>

      <ModelConfigSection
        config={config}
        connResult={connResult}
        isTesting={isTesting}
        onTestConnection={handleTestConnection}
        t={t}
      />

      <PromptTemplatesSection
        prompts={prompts}
        onUpdatePrompt={handleUpdatePrompt}
        onResetPrompt={handleResetPrompt}
        onTestPrompt={handleTestPrompt}
        isTestingPrompt={isTestingPrompt}
        t={t}
      />

      <TestConsoleSection
        prompts={prompts}
        onTestPrompt={handleTestPrompt}
        testResult={testResult}
        isTestingPrompt={isTestingPrompt}
        t={t}
      />
    </div>
  )
}

// ── Section 1: Model Configuration ────────────────────────────

function ModelConfigSection({
  config,
  connResult,
  isTesting,
  onTestConnection,
  t,
}: {
  config: { enabled: boolean; provider: string; baseUrl: string; model: string; maxTokens: number; timeoutMs: number }
  connResult: { available: boolean; models: any[]; currentModel: string; latencyMs: number } | null
  isTesting: boolean
  onTestConnection: () => void
  t: ReturnType<typeof useT>
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('admin.ai.model_config')}</CardTitle>
          </div>
          <Badge variant={config.enabled ? 'default' : 'secondary'}>
            {config.enabled ? t('admin.ai.connected') : t('admin.ai.disconnected')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('admin.ai.provider')}</Label>
            <Input value={config.provider} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('admin.ai.base_url')}</Label>
            <Input value={config.baseUrl} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('admin.ai.model')}</Label>
            <Input value={config.model} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('admin.ai.max_tokens')}</Label>
            <Input value={config.maxTokens} readOnly className="bg-muted" type="number" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('admin.ai.timeout')}</Label>
            <Input value={config.timeoutMs} readOnly className="bg-muted" type="number" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onTestConnection} disabled={isTesting} variant="outline">
            {isTesting ? '...' : t('admin.ai.test_connection')}
          </Button>

          {connResult && (
            <div className="flex items-center gap-2">
              <Badge variant={connResult.available ? 'default' : 'destructive'}>
                {connResult.available ? t('admin.ai.connected') : t('admin.ai.disconnected')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t('admin.ai.latency')}: {connResult.latencyMs}ms
              </span>
            </div>
          )}
        </div>

        {connResult?.models && connResult.models.length > 0 && (
          <div className="space-y-2">
            <Label>{t('admin.ai.model')}</Label>
            <div className="flex flex-wrap gap-2">
              {connResult.models.map((m: any) => (
                <Badge key={m.name} variant={m.name === connResult.currentModel ? 'default' : 'outline'}>
                  {m.name} ({formatBytes(m.size)})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Section 2: Prompt Templates ───────────────────────────────

function PromptTemplatesSection({
  prompts,
  onUpdatePrompt,
  onResetPrompt,
  onTestPrompt,
  isTestingPrompt,
  t,
}: {
  prompts: Array<{
    key: string
    labelKey: string
    descriptionKey: string
    category: string
    template: string
    variables: string[]
    defaultModel?: string
    lastModified: string
  }>
  onUpdatePrompt: (key: string, template: string) => Promise<void>
  onResetPrompt: (key: string) => Promise<void>
  onTestPrompt: (key: string, variables: Record<string, string>) => Promise<void>
  isTestingPrompt: boolean
  t: ReturnType<typeof useT>
}) {
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const promptsByCategory = useMemo(() => {
    const grouped: Record<string, typeof prompts> = {}
    for (const cat of CATEGORIES) {
      grouped[cat] = prompts.filter((p) => p.category === cat)
    }
    return grouped
  }, [prompts])

  const handleSave = async (key: string) => {
    const template = editedTemplates[key]
    if (template !== undefined) {
      setIsSaving(true)
      await onUpdatePrompt(key, template)
      setEditedTemplates((prev) => { const next = { ...prev }; delete next[key]; return next })
      setIsSaving(false)
    }
  }

  const handleReset = async (key: string) => {
    setIsSaving(true)
    await onResetPrompt(key)
    setEditedTemplates((prev) => { const next = { ...prev }; delete next[key]; return next })
    setIsSaving(false)
  }

  const handleTestFromPrompts = (key: string, variables: string[]) => {
    const vars: Record<string, string> = {}
    for (const v of variables) vars[v] = `[test_${v}]`
    onTestPrompt(key, vars)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.ai.prompts')}</CardTitle>
        <CardDescription>{t('admin.ai.prompts_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="explanation">
          <TabsList>
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {t(`admin.ai.category.${cat}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat} value={cat} className="space-y-4 mt-4">
              {promptsByCategory[cat]?.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('admin.ai.no_prompts')}</p>
              ) : (
                promptsByCategory[cat]?.map((prompt) => {
                  const currentTemplate = editedTemplates[prompt.key] ?? prompt.template
                  const isDirty = editedTemplates[prompt.key] !== undefined

                  return (
                    <div
                      key={prompt.key}
                      className="border border-border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            {t(prompt.labelKey)}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {t(prompt.descriptionKey)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {prompt.key}
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <textarea
                          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                          value={currentTemplate}
                          onChange={(e) =>
                            setEditedTemplates((prev) => ({
                              ...prev,
                              [prompt.key]: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {prompt.variables.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-medium">
                            {t('admin.ai.variables')}:
                          </span>
                          {prompt.variables.map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(prompt.key)}
                          disabled={!isDirty || isSaving}
                        >
                          {t('admin.ai.save_prompt')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReset(prompt.key)}
                          disabled={isSaving}
                        >
                          {t('admin.ai.reset_default')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestFromPrompts(prompt.key, prompt.variables)}
                          disabled={isTestingPrompt}
                        >
                          {t('admin.ai.test_prompt')}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ── Section 3: Test Console ───────────────────────────────────

function TestConsoleSection({
  prompts,
  onTestPrompt,
  testResult,
  isTestingPrompt,
  t,
}: {
  prompts: Array<{
    key: string
    labelKey: string
    variables: string[]
    category: string
    descriptionKey: string
    template: string
    defaultModel?: string
    lastModified: string
  }>
  onTestPrompt: (key: string, variables: Record<string, string>) => Promise<void>
  testResult: { output: string | null; latencyMs: number; source: string } | null
  isTestingPrompt: boolean
  t: ReturnType<typeof useT>
}) {
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [variables, setVariables] = useState<Record<string, string>>({})

  const selectedPrompt = prompts.find((p) => p.key === selectedKey)

  const handleSelectPrompt = (key: string) => {
    setSelectedKey(key)
    const prompt = prompts.find((p) => p.key === key)
    if (prompt) {
      const vars: Record<string, string> = {}
      for (const v of prompt.variables) vars[v] = ''
      setVariables(vars)
    }
  }

  const handleRun = () => {
    if (!selectedKey) return
    onTestPrompt(selectedKey, variables)
  }

  const result = testResult

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.ai.test_console')}</CardTitle>
        <CardDescription>{t('admin.ai.test_console_desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt selector */}
        <div className="space-y-1.5">
          <Label>{t('admin.ai.select_prompt')}</Label>
          <Select value={selectedKey} onValueChange={handleSelectPrompt}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin.ai.select_prompt')} />
            </SelectTrigger>
            <SelectContent>
              {prompts.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {t(p.labelKey)} ({p.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Variable inputs */}
        {selectedPrompt && selectedPrompt.variables.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedPrompt.variables.map((v) => (
              <div key={v} className="space-y-1.5">
                <Label className="text-xs">{v}</Label>
                <Input
                  value={variables[v] ?? ''}
                  onChange={(e) =>
                    setVariables((prev) => ({ ...prev, [v]: e.target.value }))
                  }
                  placeholder={v}
                />
              </div>
            ))}
          </div>
        )}

        {/* Run button */}
        <Button
          onClick={handleRun}
          disabled={!selectedKey || isTestingPrompt}
        >
          {isTestingPrompt ? '...' : t('admin.ai.run_test')}
        </Button>

        {/* Response area */}
        {result && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/50 p-4 font-mono text-sm whitespace-pre-wrap min-h-[100px]">
              {result.output ?? t('admin.ai.no_response')}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                {t('admin.ai.latency')}: {result.latencyMs}ms
              </Badge>
              <Badge variant={result.source === 'llm' ? 'default' : 'secondary'}>
                {t('admin.ai.source')}: {result.source}
              </Badge>
            </div>
          </div>
        )}

        {!result && !isTestingPrompt && (
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground min-h-[100px] flex items-center justify-center">
            {t('admin.ai.no_response')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
