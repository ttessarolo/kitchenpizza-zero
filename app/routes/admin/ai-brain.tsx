import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useT } from '~/hooks/useTranslation'
import { orpc } from '~/lib/orpc'
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

export const Route = createFileRoute('/admin/ai-brain')({
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

  const { data: config } = orpc.aiAdmin.getConfig.useQuery()
  const { data: prompts } = orpc.aiAdmin.listPrompts.useQuery()

  const testConnectionMutation = orpc.aiAdmin.testConnection.useMutation()
  const updatePromptMutation = orpc.aiAdmin.updatePrompt.useMutation()
  const resetPromptMutation = orpc.aiAdmin.resetPrompt.useMutation()
  const testPromptMutation = orpc.aiAdmin.testPrompt.useMutation()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('admin.ai.title')}</h2>
      </div>

      {/* Section 1: Model Configuration */}
      <ModelConfigSection
        config={config}
        testConnectionMutation={testConnectionMutation}
        t={t}
      />

      {/* Section 2: Prompt Templates */}
      <PromptTemplatesSection
        prompts={prompts ?? []}
        updatePromptMutation={updatePromptMutation}
        resetPromptMutation={resetPromptMutation}
        testPromptMutation={testPromptMutation}
        t={t}
      />

      {/* Section 3: Test Console */}
      <TestConsoleSection
        prompts={prompts ?? []}
        testPromptMutation={testPromptMutation}
        t={t}
      />
    </div>
  )
}

// ── Section 1: Model Configuration ────────────────────────────

function ModelConfigSection({
  config,
  testConnectionMutation,
  t,
}: {
  config: { enabled: boolean; provider: string; baseUrl: string; model: string; maxTokens: number; timeoutMs: number } | undefined
  testConnectionMutation: ReturnType<typeof orpc.aiAdmin.testConnection.useMutation>
  t: ReturnType<typeof useT>
}) {
  const connResult = testConnectionMutation.data

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('admin.ai.model_config')}</CardTitle>
            <CardDescription>{t('admin.ai.model_config_desc')}</CardDescription>
          </div>
          {config && (
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? t('admin.ai.connected') : t('admin.ai.disconnected')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {config ? (
          <>
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

            <p className="text-xs text-muted-foreground">{t('admin.ai.config_readonly_note')}</p>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => testConnectionMutation.mutate({})}
                disabled={testConnectionMutation.isPending}
                variant="outline"
              >
                {testConnectionMutation.isPending ? t('admin.ai.testing') : t('admin.ai.test_connection')}
              </Button>

              {connResult && (
                <div className="flex items-center gap-2">
                  <Badge variant={connResult.available ? 'default' : 'destructive'}>
                    {connResult.available ? t('admin.ai.connected') : t('admin.ai.disconnected')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('admin.ai.latency')}: {connResult.latencyMs}ms
                  </span>
                  {connResult.models.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({connResult.models.length} models)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Show available models from connection test */}
            {connResult?.models && connResult.models.length > 0 && (
              <div className="space-y-2">
                <Label>{t('admin.ai.model')}</Label>
                <div className="flex flex-wrap gap-2">
                  {connResult.models.map((m) => (
                    <Badge
                      key={m.name}
                      variant={m.name === connResult.currentModel ? 'default' : 'outline'}
                    >
                      {m.name} ({formatBytes(m.size)})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('label_loading')}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Section 2: Prompt Templates ───────────────────────────────

function PromptTemplatesSection({
  prompts,
  updatePromptMutation,
  resetPromptMutation,
  testPromptMutation,
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
  updatePromptMutation: ReturnType<typeof orpc.aiAdmin.updatePrompt.useMutation>
  resetPromptMutation: ReturnType<typeof orpc.aiAdmin.resetPrompt.useMutation>
  testPromptMutation: ReturnType<typeof orpc.aiAdmin.testPrompt.useMutation>
  t: ReturnType<typeof useT>
}) {
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({})

  const promptsByCategory = useMemo(() => {
    const grouped: Record<string, typeof prompts> = {}
    for (const cat of CATEGORIES) {
      grouped[cat] = prompts.filter((p) => p.category === cat)
    }
    return grouped
  }, [prompts])

  const handleSave = (key: string) => {
    const template = editedTemplates[key]
    if (template !== undefined) {
      updatePromptMutation.mutate({ key, template })
      setEditedTemplates((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleReset = (key: string) => {
    resetPromptMutation.mutate({ key })
    setEditedTemplates((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleTestFromPrompts = (key: string, variables: string[]) => {
    const vars: Record<string, string> = {}
    for (const v of variables) {
      vars[v] = `[test_${v}]`
    }
    testPromptMutation.mutate({ key, variables: vars })
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
                          disabled={!isDirty || updatePromptMutation.isPending}
                        >
                          {t('admin.ai.save_prompt')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReset(prompt.key)}
                          disabled={resetPromptMutation.isPending}
                        >
                          {t('admin.ai.reset_default')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestFromPrompts(prompt.key, prompt.variables)}
                          disabled={testPromptMutation.isPending}
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
  testPromptMutation,
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
  testPromptMutation: ReturnType<typeof orpc.aiAdmin.testPrompt.useMutation>
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
      for (const v of prompt.variables) {
        vars[v] = ''
      }
      setVariables(vars)
    }
  }

  const handleRun = () => {
    if (!selectedKey) return
    testPromptMutation.mutate({ key: selectedKey, variables })
  }

  const result = testPromptMutation.data

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
          disabled={!selectedKey || testPromptMutation.isPending}
        >
          {testPromptMutation.isPending ? t('admin.ai.testing') : t('admin.ai.run_test')}
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

        {!result && !testPromptMutation.isPending && (
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground min-h-[100px] flex items-center justify-center">
            {t('admin.ai.no_response')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
