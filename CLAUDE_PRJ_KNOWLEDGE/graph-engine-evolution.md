# Graph Engine Evolution — Implementation Plan

> **Branch:** `feat/multi-brain-engine`
> **Objective:** Migrate from client-side graph computation to a server-side multi-brain architecture with Graphology graph engine, domain-specific query DSL, and Transformers.js v4 tiny LLM.
> **Deploy target:** Netlify (Node.js 24)

---

## Architectural Principles (NON-NEGOTIABLE)

1. **Graph Editor = Desktop ONLY** — Mobile/web-mobile is a thin AI-driven layer.
2. **Science External to Code** — ALL scientific values, formulas, thresholds in JSON/DB. Managers are orchestrators, NEVER hardcode.
3. **Server-Side Computation** — ALL scientific/algorithmic computation via oRPC. Client = thin UX renderer. `staticProvider` must be eliminated from client bundle.

---

## Three-Brain Architecture

```
CLIENT (thin)                         SERVER (Node.js / Netlify Functions)
┌─────────────────┐                  ┌──────────────────────────────────────────┐
│ React Flow      │                  │ ORCHESTRATOR (oRPC procedures)           │
│ (render only)   │ ←── oRPC ───→   │                                          │
│                 │                  │ ┌──────────┐ ┌────────┐ ┌────────────┐  │
│ User mutations  │                  │ │BRAIN 1   │ │BRAIN 2 │ │BRAIN 3     │  │
│ → oRPC call     │                  │ │Graphology│ │Science │ │Tiny LLM    │  │
│                 │                  │ │+ DSL     │ │Determ. │ │Transformers│  │
│ Receives:       │                  │ │          │ │        │ │.js v4      │  │
│ - updated graph │                  │ │Structure │ │Formulas│ │            │  │
│ - warnings      │                  │ │Traversal │ │Rules   │ │NL→Constr.  │  │
│ - schedule      │                  │ │Pattern   │ │Chains  │ │Explain     │  │
│ - explanations  │                  │ │Subgraph  │ │Catalog │ │Query gen   │  │
│                 │                  │ └──────────┘ └────────┘ └────────────┘  │
└─────────────────┘                  │                                          │
                                     │ Knowledge Base: JSON files (/science/)   │
                                     └──────────────────────────────────────────┘
```

---

## Phase 0: Branch Setup & Infrastructure

### 0.1 Create feature branch
```bash
git checkout -b feat/multi-brain-engine
```

### 0.2 Install new dependencies
```bash
pnpm add graphology graphology-traversal graphology-shortest-path graphology-components graphology-operators graphology-utils
pnpm add @huggingface/transformers
```

### 0.3 Verify Netlify compatibility
- Graphology: pure JS, no native bindings → ✅ Netlify Functions compatible
- Transformers.js v4: ONNX Runtime for Node.js → verify Netlify Function size limits (max 250MB bundled). Qwen3-0.6B q4 (~400MB) may exceed limit → use model download at warm-up, NOT bundled.

**Decision point:** if Netlify Functions cannot host the LLM model due to size/memory, Brain 3 (tiny LLM) deploys as a separate Netlify Background Function or dedicated endpoint that lazy-loads the model. Brain 1 and Brain 2 work without Brain 3 — the LLM is an enhancement, not a dependency.

---

## Phase 1: Server-Side Graph Engine (Brain 1)

### Goal
Replace flat `nodes[]` + `edges[]` arrays with a Graphology `DirectedGraph` on the server. All graph operations (traversal, topological sort, pattern matching) use Graphology's API.

### 1.1 Create RecipeGraphEngine

**New file:** `app/server/engines/recipe-graph-engine.ts`

```typescript
import Graph from 'graphology'
import { bfsFromNode, dfsFromNode } from 'graphology-traversal'
import { topologicalSort } from 'graphology-dag'

export class RecipeGraphEngine {
  private graph: Graph

  constructor() {
    this.graph = new Graph({ type: 'directed', multi: false, allowSelfLoops: false })
  }

  // Load from RecipeGraph (current format) → Graphology
  loadFromRecipeGraph(recipeGraph: RecipeGraph): void

  // Export Graphology → RecipeGraph (for client consumption)
  toRecipeGraph(): RecipeGraph

  // Topology
  topologicalSort(): string[]
  hasCycles(): boolean
  criticalPath(): string[]

  // Traversal
  ancestors(nodeId: string): string[]
  descendants(nodeId: string): string[]
  pathsBetween(from: string, to: string): string[][]

  // Pattern matching (DSL executor)
  executeQuery(query: GraphQuery): QueryResult[]

  // Subgraph operations (layer mixing)
  extractLayer(layerId: string): Graph
  mergeLayer(sourceGraph: Graph, targetLayerId: string): void

  // Scheduling
  computeSchedule(startTime?: Date, deadline?: Date): ScheduleResult
  backwardSchedule(deadline: Date, userTimetable: TimeSlot[]): ScheduleResult
}
```

### 1.2 Create Domain Query DSL

**New file:** `app/server/engines/graph-query-dsl.ts`

The DSL is JSON-based, designed to be readable by non-programmers and generatable by LLMs.

```typescript
// Query DSL types
export interface GraphQuery {
  type: 'find_path' | 'find_pattern' | 'find_nodes' | 'aggregate'
  // find_path: path between nodes with conditions
  from?: NodeMatcher
  to?: NodeMatcher
  through?: NodeMatcher       // must pass through
  notThrough?: NodeMatcher    // must NOT pass through
  maxHops?: number
  // find_pattern: sequence of node types
  pattern?: NodeMatcher[]
  // find_nodes: filter nodes
  where?: NodeMatcher
  // aggregate: compute values along paths
  aggregate?: { field: string, op: 'sum' | 'max' | 'min' | 'avg' }
}

export interface NodeMatcher {
  type?: string | string[]    // NodeTypeKey
  where?: Record<string, { op: string, value: unknown }>
  negate?: boolean
}

export interface QueryResult {
  nodes: string[]
  paths?: string[][]
  value?: number
}
```

**Example rule using DSL (in science/rules/*.json):**
```json
{
  "id": "acclimatization_missing",
  "type": "warning",
  "category": "fermentation",
  "severity": "warning",
  "messageKey": "warning.acclimatization_missing",
  "graphQuery": {
    "type": "find_path",
    "from": { "type": "rise", "where": { "riseMethod": { "op": "eq", "value": "fridge" } } },
    "to": { "type": "bake" },
    "notThrough": { "type": "rise", "where": { "riseMethod": { "op": "eq", "value": "room" } } },
    "maxHops": 3
  },
  "actions": [
    {
      "labelKey": "action.add_acclimatization",
      "mutations": [{ "type": "addNodeAfter", "nodeType": "rise", "data": { "riseMethod": "room", "baseDur": 120 } }]
    }
  ]
}
```

### 1.3 Migrate graph-reconciler.service.ts

**Current file:** `app/server/services/graph-reconciler.service.ts` (1,829 lines)

**Migration strategy:**
1. Create `app/server/services/graph-reconciler-v2.service.ts`
2. Replace manual topological sort with `RecipeGraphEngine.topologicalSort()`
3. Replace manual ancestor/descendant lookups with engine methods
4. Replace manual pattern checks (acclimatization, fridge→bake sequence) with DSL queries
5. Keep the pure-function signature: `reconcileGraph(graph, portioning, meta, provider) → ReconcileResult`
6. Internally: create RecipeGraphEngine → load graph → execute queries → apply mutations → export back

**DO NOT modify v1 reconciler** — keep it working alongside v2 for A/B testing.

### 1.4 Files to create/modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `app/server/engines/recipe-graph-engine.ts` | Graphology wrapper |
| CREATE | `app/server/engines/graph-query-dsl.ts` | DSL types + executor |
| CREATE | `app/server/services/graph-reconciler-v2.service.ts` | V2 reconciler using engine |
| MODIFY | `app/server/procedures/graph.ts` | Use v2 reconciler |
| MODIFY | `app/server/router.ts` | Add new graph procedures |

---

## Phase 2: Client→Server Migration

### Goal
Eliminate ALL direct manager imports from the client. The store calls oRPC, receives results, updates React Flow.

### 2.1 New oRPC procedures

Add these procedures to handle all client interactions:

```typescript
// app/server/procedures/graph-v2.ts
graph.reconcile      // Full reconciliation (exists, now uses v2 engine)
graph.applyMutation  // Single node/edge mutation → reconcile → return result
graph.applyAction    // Apply warning action → reconcile → return result
graph.addLayer       // Add layer with template → return populated graph
graph.removeLayer    // Remove layer → return updated graph
graph.mixLayers      // Cross-layer merge from library → return combined graph

// app/server/procedures/schedule-v2.ts
schedule.compute     // Forward schedule computation
schedule.backward    // Backward schedule from deadline + timetable

// app/server/procedures/explain.ts (Brain 3 integration)
explain.warning      // Explain a warning in natural language
explain.recipe       // Generate recipe overview/coaching text
explain.adapt        // NL request → structured constraints → adapted recipe
```

### 2.2 Migrate recipe-flow-store.ts

**Current state:** 20,599 tokens with direct imports of managers and staticProvider.

**Migration strategy — function by function:**

| Current client call | New oRPC call | Notes |
|---|---|---|
| `reconcileGraph(graph, portioning, meta, staticProvider)` | `orpc.graph.reconcile.mutate({graph, portioning, meta})` | Remove staticProvider import |
| `calcYeastPct(staticProvider, ...)` | `orpc.dough.calcYeast.query({...})` | Already exists server-side |
| `computePanoramica(staticProvider, layers, crossEdges)` | `orpc.panoramica.compute.query({layers, crossEdges})` | Already exists server-side |
| `reconcilePreFerments(...)` | Handled inside `graph.reconcile` | Remove separate call |
| `autoCorrectGraph(...)` | Handled inside `graph.reconcile` | Integrate into v2 reconciler |
| `blendFlourProperties(...)` | `orpc.flour.blend.query({...})` | New procedure |
| `computeGraphTotals(...)` | Return as part of `graph.reconcile` result | No separate call needed |
| `generateLayerGraph(...)` | `orpc.graph.addLayer.mutate({...})` | Template generation server-side |

**Imports to REMOVE from store:**
```typescript
// DELETE these imports
import { reconcilePreFerments } from '@commons/utils/pre-ferment-manager'
import { getDoughDefaults, calcYeastPct, estimateBlendW } from '@commons/utils/dough-manager'
import { autoCorrectGraph } from '@commons/utils/recipe-auto-correct-manager'
import { computePanoramica } from '@commons/utils/panoramica-manager'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import { staticProvider } from '@commons/utils/science/static-science-provider'
```

**Imports to REMOVE from components:**
- `DoughCompositionPanel.tsx` — remove direct `calcYeastPct`, `blendFlourProperties` calls
- `FlourMixSelector.tsx` — remove direct flour manager calls
- Any component importing from `@commons/utils/*-manager`

### 2.3 Eliminate staticProvider

**File to DELETE (or deprecate):** `commons/utils/science/static-science-provider.ts`

This file statically imports 34 JSON science files into the browser bundle. After migration, all science evaluation happens server-side via `FileScienceProvider`. The client never needs science data.

**Verification:** grep the entire codebase for `staticProvider` — zero references should remain in `app/` after migration.

### 2.4 Client-side optimistic updates

The store should implement optimistic UI updates:
1. User drags a node → update position locally (no oRPC needed)
2. User changes a value → call `orpc.graph.applyMutation` → show loading indicator on affected nodes → update with server response
3. Debounce rapid mutations (e.g., slider dragging) — send only after 300ms idle

### 2.5 Files to create/modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `app/server/procedures/graph-v2.ts` | New graph procedures |
| CREATE | `app/server/procedures/schedule-v2.ts` | Schedule with backward scheduling |
| CREATE | `app/server/procedures/explain.ts` | LLM explanation procedures |
| MODIFY | `app/stores/recipe-flow-store.ts` | Replace manager imports with oRPC calls |
| MODIFY | `app/components/recipe-flow/DoughCompositionPanel.tsx` | Remove manager imports |
| MODIFY | `app/components/recipe-flow/FlourMixSelector.tsx` | Remove manager imports |
| DELETE | `commons/utils/science/static-science-provider.ts` | No longer needed |
| MODIFY | `app/server/router.ts` | Register new procedures |

---

## Phase 3: Tiny LLM Integration (Brain 3)

### Goal
Integrate a local Qwen3-0.6B (or 1.7B) model via Transformers.js v4 on the server for: NL→constraints translation, warning explanations, cross-layer compatibility assessment, and DSL query generation.

### 3.1 Model selection

**Primary:** `onnx-community/Qwen3-0.6B-ONNX` (q4f16 quantization, ~400MB)
**Fallback if capable enough for structured output:** promote to Qwen3-1.7B after testing

**Why Qwen3:** best-in-class structured JSON output for its size, excellent multilingual (Italian), same family as embedding model in CSB.

### 3.2 LLM Service

**New file:** `app/server/services/llm-service.ts`

```typescript
import { pipeline, TextGenerationPipeline } from '@huggingface/transformers'

class LLMService {
  private generator: TextGenerationPipeline | null = null
  private loading: Promise<void> | null = null

  // Lazy initialization — model loads on first call
  async ensureReady(): Promise<void>

  // Core generation with structured output
  async generate(prompt: string, schema?: JsonSchema): Promise<string>

  // Domain-specific methods
  async naturalLanguageToConstraints(userInput: string, recipeContext: RecipeSummary): Promise<AdaptationConstraints>
  async explainWarning(warning: ActionableWarning, recipeContext: RecipeSummary, locale: string): Promise<string>
  async assessCrossLayerCompatibility(layer1: LayerSummary, layer2: LayerSummary): Promise<CompatibilityAssessment>
  async generateGraphQuery(naturalLanguage: string): Promise<GraphQuery>
}

export const llmService = new LLMService()
```

### 3.3 Prompt templates

**New directory:** `app/server/prompts/`

Store prompt templates as `.md` files (same pattern as CSB):

| File | Purpose |
|------|---------|
| `nl-to-constraints.md` | System prompt for NL→structured constraint extraction |
| `explain-warning.md` | System prompt for warning explanation generation |
| `cross-layer-compat.md` | System prompt for cross-layer compatibility assessment |
| `generate-query.md` | System prompt for DSL query generation from NL |

### 3.4 Graceful degradation

Brain 3 is OPTIONAL. If the model fails to load, is too slow, or returns invalid output:
- `explain.warning` returns `null` → client shows the raw i18n message (existing behavior)
- `explain.adapt` returns an error → client shows "adaptation not available" message
- `graph.mixLayers` works without LLM — uses deterministic compatibility rules only

### 3.5 Netlify deployment strategy

**Option A: Netlify Function with lazy model loading**
- Model downloaded from HuggingFace on first invocation
- Cached in `/tmp` (Netlify Function ephemeral storage)
- Cold start: ~15-30s (model download + initialization)
- Warm invocations: ~200ms-2s per generation
- **Risk:** Function timeout (default 10s, max 26s on Pro plan)

**Option B: Netlify Background Function**
- No timeout limit
- Long-running LLM calls handled asynchronously
- Client polls for completion or uses server-sent events

**Option C: Separate persistent Node.js process (future)**
- If Netlify limits prove blocking, deploy LLM service separately
- KitchenPizza server calls LLM service via HTTP

**Recommendation:** Start with Option A. The LLM is used for non-blocking enrichments (explanations, coaching) — if cold start is slow, the UX gracefully degrades. For the `explain.adapt` flow (which IS user-blocking), use Option B or queue-based approach.

### 3.6 Files to create

| Action | File | Description |
|--------|------|-------------|
| CREATE | `app/server/services/llm-service.ts` | Transformers.js LLM wrapper |
| CREATE | `app/server/prompts/nl-to-constraints.md` | Prompt template |
| CREATE | `app/server/prompts/explain-warning.md` | Prompt template |
| CREATE | `app/server/prompts/cross-layer-compat.md` | Prompt template |
| CREATE | `app/server/prompts/generate-query.md` | Prompt template |
| MODIFY | `app/server/procedures/explain.ts` | Wire LLM service |

---

## Phase 4: Science Externalization Completion

### Goal
Migrate the ~25% of science still hardcoded in TypeScript managers into JSON science blocks.

### 4.1 Inventory of hardcoded science

| Manager | Hardcoded Logic | Migration Target |
|---------|----------------|-----------------|
| `dough-manager.ts` | `calcFinalDoughTemp()` — weighted average + 15% air + friction | New formula: `science/formulas/dough-temp.json` |
| `dough-manager.ts` | `computeSuggestedSalt()` — base 2.5% with hydration adj, clamp 2.0-3.0 | New formula: `science/formulas/suggested-salt.json` |
| `rise-manager.ts` | `riseTemperatureFactor()` — Q10 coefficients (room=1.0, ctrl18=0.2, ctrl12=0.1, fridge=0.05) | Move coefficients to `science/catalogs/rise-methods.json` |
| `bake-manager.ts` | `calcDuration()` — multi-factor per cooking method (7 switch branches) | New factor chains per method in `science/formulas/bake-duration-*.json` |
| `bake-manager.ts` | Default oven configs per subtype | Move to `science/defaults/oven-config.json` |
| `bake-manager.ts` | Validation ranges per cooking method | Move to `science/rules/baking-validation.json` |
| `bake-manager.ts` | `syncCookingFats()` — default frying fat types | Move to `science/catalogs/cooking-fats.json` |
| `fermentation-coherence-manager.ts` | Acclimatization detection — imperative graph traversal | Replace with DSL graph query in rules |
| `local_data/dough-defaults.ts` | 20 entries of type/subtype → composition ranges | Already structured → move to `science/defaults/dough.json` (partially done) |
| `local_data/baking-profiles.ts` | 30+ baking profiles with material factors | Move to `science/catalogs/baking-profiles.json` (partially done) |

### 4.2 Migration approach

For each hardcoded value:
1. Create the appropriate JSON science block (formula / factor-chain / catalog / rule)
2. Update the manager to call `provider.getFormula(id)` + `evaluateFormula()` instead of hardcoded logic
3. Verify with existing tests that outputs are identical
4. Remove the hardcoded constants

### 4.3 Files to create/modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `science/formulas/dough-temp.json` | Final dough temp formula |
| CREATE | `science/formulas/suggested-salt.json` | Salt % suggestion formula |
| CREATE | `science/formulas/bake-duration-forno.json` | Bake duration (oven) |
| CREATE | `science/formulas/bake-duration-frittura.json` | Bake duration (frying) |
| CREATE | `science/formulas/bake-duration-griglia.json` | Bake duration (grill) |
| CREATE | `science/formulas/bake-duration-padella.json` | Bake duration (pan) |
| CREATE | `science/formulas/bake-duration-vapore.json` | Bake duration (steam) |
| CREATE | `science/formulas/bake-duration-aria.json` | Bake duration (air fryer) |
| CREATE | `science/defaults/oven-config.json` | Default oven configs |
| CREATE | `science/catalogs/cooking-fats.json` | Default frying fats |
| CREATE | `science/rules/baking-validation.json` | Baking range validation |
| MODIFY | `commons/utils/dough-manager.ts` | Use provider for temp/salt |
| MODIFY | `commons/utils/rise-manager.ts` | Use provider for temp factors |
| MODIFY | `commons/utils/bake-manager.ts` | Use provider for all bake logic |
| MODIFY | `commons/utils/fermentation-coherence-manager.ts` | Replace traversal with DSL |
| DELETE | `local_data/dough-defaults.ts` | Migrated to science/defaults/ |
| DELETE | `local_data/baking-profiles.ts` | Migrated to science/catalogs/ |

---

## Phase 5: Test Plan

### 5.1 Unit Tests

**Graph Engine (Brain 1):**

| Test | File | What it verifies |
|------|------|-----------------|
| `recipe-graph-engine.test.ts` | `app/server/engines/` | Load/export roundtrip: RecipeGraph → Graphology → RecipeGraph produces identical structure |
| | | Topological sort matches existing Kahn's algorithm output |
| | | `ancestors()` and `descendants()` return correct node sets |
| | | `hasCycles()` detects circular dependencies |
| | | `criticalPath()` identifies longest path |
| | | `extractLayer()` produces valid subgraph with all internal edges |
| | | `mergeLayer()` correctly integrates layer into existing graph |
| `graph-query-dsl.test.ts` | `app/server/engines/` | `find_path` returns correct paths |
| | | `find_path` with `notThrough` correctly excludes paths |
| | | `find_pattern` matches sequential node type patterns |
| | | `find_nodes` filters by attribute conditions |
| | | `aggregate` computes sum/max/min along paths |
| | | Invalid queries return empty results, not errors |

**Reconciler V2:**

| Test | File | What it verifies |
|------|------|-----------------|
| `graph-reconciler-v2.test.ts` | `app/server/services/` | **Parity test:** v2 reconciler produces IDENTICAL warnings to v1 for all test fixtures |
| | | Topological ordering is correct for all fixture graphs |
| | | Warning generation: each rule type produces expected warnings |
| | | Action application: mutations modify graph correctly |
| | | Lock enforcement: locked fields not overwritten |
| | | Pre-ferment reconciliation: ingredient distribution correct |
| | | Fermentation coherence: equivalent room hours calculation matches v1 |

**Science externalization:**

| Test | File | What it verifies |
|------|------|-----------------|
| `science-parity.test.ts` | `tests/` | For each migrated formula: JSON-based calculation matches hardcoded TypeScript output for 100+ input combinations |
| | | Dough temp: JSON formula matches `calcFinalDoughTemp()` within 0.1°C |
| | | Salt suggestion: JSON formula matches `computeSuggestedSalt()` within 0.01% |
| | | Bake duration: JSON factor chains match all 7 cooking methods |
| | | Rise temp factor: JSON catalog values match hardcoded coefficients exactly |

### 5.2 Integration Tests

| Test | File | What it verifies |
|------|------|-----------------|
| `oRPC-graph.integration.test.ts` | `tests/` | `graph.reconcile` endpoint: accepts RecipeGraph, returns reconciled graph + warnings |
| | | `graph.applyMutation` endpoint: accepts mutation, returns updated graph |
| | | `graph.addLayer` endpoint: returns populated layer with correct template |
| | | Error handling: invalid graph returns meaningful errors |
| `oRPC-schedule.integration.test.ts` | `tests/` | `schedule.compute` endpoint: returns valid schedule |
| | | `schedule.backward` endpoint: respects deadline constraint |
| | | Schedule + timetable: unavailable slots correctly avoided |
| `oRPC-explain.integration.test.ts` | `tests/` | `explain.warning` endpoint: returns string or null (graceful degradation) |
| | | `explain.adapt` endpoint: returns adapted recipe or error |
| | | LLM unavailable: all endpoints degrade gracefully |

### 5.3 Regression Tests

**Critical:** Create test fixtures from CURRENT production recipes before starting migration.

```typescript
// tests/fixtures/regression/
// - napoletana-base.json          → standard pizza napoletana
// - romana-teglia.json            → teglia romana with pre-ferment
// - focaccia-genovese.json        → focaccia with high hydration
// - pane-integrale.json           → whole grain bread
// - brioche.json                  → enriched dough (high fat)
// - multi-layer-pizza.json        → impasto + sauce + prep layers
```

For each fixture:
1. Run v1 reconciler → save output (graph + warnings + schedule)
2. Run v2 reconciler → compare output
3. **Zero-diff tolerance** on warnings (same messageKeys, same severities)
4. **0.1% tolerance** on numeric values (ingredient quantities, durations)

### 5.4 LLM Tests

| Test | What it verifies |
|------|-----------------|
| Model loads successfully | Transformers.js initializes without errors |
| Structured output valid | `naturalLanguageToConstraints()` returns valid JSON matching schema |
| Graceful degradation | Timeout/error → returns null, no crash |
| Italian language | Model responds correctly to Italian input |
| Explanation quality | Manual review of 10 warning explanations (spot check, not automated) |

### 5.5 E2E Tests

| Test | What it verifies |
|------|-----------------|
| Recipe creation flow | Create new recipe → select layer type → graph populates → warnings appear |
| Node editing | Edit node value → server reconciles → warnings update → UI reflects changes |
| Warning action | Click warning action → server applies mutation → graph updates correctly |
| Layer mixing | Select layer from library → merge into recipe → cross-layer edges created |
| No client-side science | Browser network tab shows NO imports of science JSON files |

---

## Phase 6: Deployment

### 6.1 Environment variables

Add to `.env` and Netlify dashboard:

```env
# Brain 3 - Tiny LLM
TRANSFORMERS_MODEL=onnx-community/Qwen3-0.6B-ONNX
TRANSFORMERS_QUANTIZATION=q4f16
LLM_ENABLED=true                    # Feature flag to disable LLM entirely
LLM_MAX_TOKENS=512
LLM_TIMEOUT_MS=10000
```

### 6.2 Netlify configuration

Update `netlify.toml`:
```toml
[functions]
  node_bundler = "esbuild"
  included_files = ["science/**/*.json", "commons/i18n/**/*.json"]

[functions."api-rpc-*"]
  timeout = 26                      # Max for Pro plan
```

### 6.3 Feature flags

Implement feature flags for gradual rollout:
- `USE_V2_RECONCILER=true/false` — switch between v1 and v2 reconciler
- `LLM_ENABLED=true/false` — enable/disable Brain 3
- `SERVER_SIDE_ONLY=true/false` — during migration, allows fallback to client-side

### 6.4 Deployment order

1. Deploy with `USE_V2_RECONCILER=false` — only new endpoints, no behavior change
2. Run regression tests in production
3. Enable `USE_V2_RECONCILER=true` — switch to v2 reconciler
4. Monitor for 48h
5. Enable `LLM_ENABLED=true` — activate Brain 3
6. Remove v1 reconciler code after 2 weeks of stable v2

---

## Implementation Order

Execute phases in this order:

1. **Phase 0** → Branch + dependencies (1 day)
2. **Phase 5.3** → Create regression fixtures FIRST (1 day)
3. **Phase 1** → Graph engine + DSL (3-4 days)
4. **Phase 2** → Client→server migration (3-4 days)
5. **Phase 4** → Science externalization (2-3 days)
6. **Phase 5** → Full test suite (2-3 days)
7. **Phase 3** → LLM integration (2-3 days)
8. **Phase 6** → Deploy (1 day)

**Total estimated:** 15-19 days of development

---

## Key Constraints for Claude Code

- NEVER hardcode scientific values in TypeScript — use `provider.getFormula()` / `provider.getCatalog()`
- NEVER import managers in client code — all via oRPC
- NEVER import `staticProvider` — it must be eliminated
- ALL new i18n keys MUST be added to BOTH `en` and `it` JSON files
- ALL mutations MUST return the full updated graph + warnings (not partial updates)
- ALL LLM outputs MUST be validated against Zod schemas before use
- Preserve EXACT numeric precision — 70% hydration is NOT 70.1%
