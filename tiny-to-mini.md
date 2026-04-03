# Tiny → Mini: Brain 3 Migration Changelog

> Data migrazione: 2026-04-03
> Branch: `feat/multi-brain-engine`

## Cosa è cambiato

- **Provider**: Ollama/HuggingFace (Qwen 0.8B locale) → OpenAI API (gpt-5.4-mini cloud)
- **SDK**: raw `fetch` → package `openai` ufficiale (v6+)
- **Perimetro default**: `tiny_no_finetune` (molto restrittivo) → `openai_mini` (ampliato: downgrade 2 step, upgrade 1 step, dismiss warning, confidence 0.65)
- **Max tokens**: 512 → 4096
- **Timeout**: 10s → 30s
- **Prompt**: minimali (1 frase) → ricchi (3-5 frasi, più contesto, dettagli nodi e farina)
- **JSON output**: `format: 'json'` Ollama-specifico → `response_format: { type: 'json_object' }` OpenAI nativo

## File eliminati

- `app/server/services/llm/ollama-provider.ts`
- `app/server/services/llm/hf-api-provider.ts`
- `tests/ollama-provider.test.ts`

## File creati

- `app/server/services/llm/openai-provider.ts` — nuovo provider con SDK OpenAI
- `tests/openai-provider.test.ts` — test con mock del package openai
- `tiny-to-mini.md` — questo file

## File chiave modificati

| File | Cambiamento |
|------|-------------|
| `llm-service.ts` | Switch provider: openai / noop (rimossi ollama, hf_api) |
| `feature-flags.ts` | `LLM_PROVIDER: 'openai' \| 'noop'` (era `'ollama' \| 'hf_api' \| 'noop'`) |
| `ai-admin.ts` (schema) | Rimosso `baseUrl`, `ollamaModelSchema`; aggiunto `apiKeySet` |
| `ai-admin.ts` (procedure) | `getConfig/testConnection` leggono `OPENAI_*` env vars |
| `llm-perimeter.ts` | Preset `openai_mini` come default; rimossi `tiny_no_finetune`, `tiny_finetuned` |
| `llm-prompts.ts` | Prompt più ricchi, nuove variabili (`nodeDetails`, `flourBlendInfo`, `recipeSummary`, `availableFlours`, `availableOvens`) |
| `verify-reconciliation.ts` | `buildRecipeSummary()` invia più dati; `extractFlourW()` dal grafo reale; rimossa mappa `LOCALE_NAMES` |
| `admin/ai-brain.tsx` | Rimosso `OllamaProvider`, `formatBytes`, lista modelli; aggiunto indicatore API Key |
| `admin/index.tsx` | `ollamaStatus/ollamaModel` → `llmStatus/llmModel`; usa `getCurrentProvider()` |
| `.env.example` | Rimossi `OLLAMA_*`, `HF_*`; aggiornati default LLM |
| `ROADMAP.md` | Brain 3 section riscritta per OpenAI gpt-5.4-mini |
| `graph-engine-evolution.md` | Diagramma e Phase 3 aggiornati |
| `commons/i18n/*/common.json` | Rimosso `base_url`; aggiunti `api_key_status/configured/missing` |

## ENV rimosse

```
OLLAMA_BASE_URL
OLLAMA_MODEL
HF_API_TOKEN
HF_MODEL_ID
```

## ENV nuove/aggiornate

```
OPENAI_API_KEY=sk-proj-...     # nuova
OPENAI_MODEL=gpt-5.4-mini     # nuova
LLM_PROVIDER=openai            # era 'ollama'
LLM_MAX_TOKENS=4096            # era 512
LLM_TIMEOUT_MS=30000           # era 10000
```

## Impatto architetturale

- L'interfaccia `LlmProvider` (`isAvailable`, `generate`, `generateJSON`) è **INVARIATA**
- Il flusso Brain 1 → 2 → 3 è **INVARIATO**
- Il principio science-dominates-LLM (perimetro) è **INVARIATO**
- Il graceful degradation (`NoopProvider` quando `LLM_ENABLED=false`) è **INVARIATO**
- L'admin panel mantiene la stessa struttura (config + prompt editor + test console)

## Cosa è cambiato nel perimetro

| Capacità | Prima (`tiny_no_finetune`) | Dopo (`openai_mini`) |
|----------|---------------------------|----------------------|
| Downgrade severity | 1 step max | 2 step max |
| Upgrade severity | No | 1 step max |
| Dismiss warnings | No | Si, fino a severity `warning` |
| Auto-action confidence | 0.85 (molto cauto) | 0.65 (più fiducioso) |
| Generate insights | Si | Si |

## Rollback

Per disabilitare Brain 3 senza rollback del codice:
```env
LLM_ENABLED=false
# oppure
LLM_PROVIDER=noop
```
Il sistema funziona identicamente senza LLM — i warning vengono mostrati senza verifica AI.
