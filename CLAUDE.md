# Project Architecture & Conventions

## Overview

Monorepo full-stack application with **web** (TanStack Start) and **native mobile** (Expo/React Native) clients sharing a common codebase. Type-safe RPC API layer, raw SQL on serverless PostgreSQL, immutable state management.

**Stack:** TypeScript, pnpm workspaces, Vite 8, React 19, Expo 55, Zod 4, oRPC, Zustand + Immer, Tailwind CSS 4, shadcn/ui, Neon (serverless PostgreSQL), Clerk auth, Sentry monitoring, Netlify deploy.

**Web Part**
Il progetto web è MOBILE first.
Usa shadcn per le componenti.
Usa Tailwind per gli stili.
(tutti in ultima versione)

---

## Monorepo Structure

```
/
├── app/                    # Web application (TanStack Start)
│   ├── routes/             # File-based routing (TanStack Router)
│   │   ├── __root.tsx      # Root layout (providers, global state)
│   │   ├── index.tsx       # Landing page
│   │   ├── api/            # API routes
│   │   │   ├── rpc.$.ts    # oRPC endpoint (RPCHandler + CORSPlugin)
│   │   │   └── webhooks/   # Webhook handlers (e.g., Clerk)
│   │   ├── sign-in/        # Auth routes
│   │   ├── sign-up/        # Registration routes
│   │   └── main/           # Protected app routes (nested layouts)
│   ├── server/             # Backend layer
│   │   ├── router.ts       # oRPC router (assembles all procedures)
│   │   ├── procedures/     # Domain procedures (one file per domain)
│   │   ├── schemas/        # Zod schemas (input/output validation)
│   │   ├── services/       # Business logic (raw SQL queries)
│   │   └── middleware/     # oRPC middleware (auth, error handling)
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui primitives
│   │   └── {domain}/       # Domain-specific components
│   ├── store/              # Zustand store (web-specific init)
│   │   ├── index.ts        # Store creation (immer + persist)
│   │   ├── slices/         # Re-exports from commons
│   │   └── hooks/          # Store hooks (hydration, version check)
│   ├── lib/                # Utilities
│   │   ├── db.ts           # Neon client + error capture
│   │   ├── orpc.ts         # Isomorphic oRPC client (SSR + browser)
│   │   ├── auth.ts         # Auth helpers (hasRole, isAdmin)
│   │   └── utils.ts        # General utilities
│   ├── types/              # Web-specific type definitions
│   ├── styles/             # CSS (globals.css with Tailwind)
│   ├── hooks/              # Custom React hooks
│   ├── icons/              # SVG icons (via vite-plugin-svgr)
│   ├── start.ts            # TanStack Start init (Clerk middleware)
│   ├── router.tsx          # Router creation (Sentry client integration)
│   └── sentry.server.ts    # Sentry server-side init
│
├── commons/                # Shared code between web and native
│   ├── index.ts            # Central re-export point
│   ├── types/              # Shared TypeScript type definitions
│   │   ├── db.ts           # Database entity interfaces + type aliases
│   │   └── components.ts   # Shared component types
│   ├── store/              # Zustand store definitions
│   │   ├── types.ts        # State interfaces (all slices)
│   │   └── slices/         # Slice creators (StateCreator pattern)
│   │       ├── ui.ts       # UI state (collapsed sections)
│   │       ├── filters.ts  # Filter state per view
│   │       ├── quiz.ts     # Active quiz state
│   │       ├── sfide.ts    # Multiplayer state
│   │       └── version.ts  # App version state
│   └── constants/          # Business logic constants
│       └── index.ts        # Shared constants, enums, config values
│
├── native/                 # Expo/React Native mobile app
│   ├── app/                # File-based routing (Expo Router)
│   │   ├── _layout.tsx     # Root layout (providers)
│   │   ├── index.tsx       # Initial auth redirect
│   │   ├── (auth)/         # Auth screens (sign-in)
│   │   └── (app)/          # Protected screens
│   │       ├── _layout.tsx # Stack navigator with auth guard
│   │       └── {screens}/  # Feature screens
│   ├── components/         # Native UI components
│   │   └── ui/             # Native UI primitives
│   ├── lib/                # Native utilities
│   │   ├── orpc.ts         # Native oRPC client (Bearer token auth)
│   │   ├── orpc-context.tsx # oRPC React context provider
│   │   ├── colors.ts       # Color tokens
│   │   └── format.ts       # Formatting utilities
│   ├── app.json            # Expo config
│   ├── package.json        # Native dependencies
│   └── tsconfig.json       # Native TS config (path alias: @commons)
│
├── tests/                  # Test files (vitest)
│   ├── setup.ts            # Test setup (@testing-library/jest-dom)
│   └── *.test.{ts,tsx}     # Test files
│
├── package.json            # Root workspace (all shared deps)
├── pnpm-workspace.yaml     # Workspace config: ".", "commons", "native"
├── tsconfig.json           # Root TS config (strict, ES2022)
├── vite.config.ts          # Vite config (plugins, aliases)
├── vitest.config.ts        # Vitest config (jsdom, globals)
├── tailwind.config.ts      # Tailwind config (dark mode, CSS vars)
├── components.json         # shadcn/ui config
├── netlify.toml            # Netlify deploy config
├── app.config.ts           # TanStack Start config
└── .env.example            # Environment variables template
```

---

## Key Architectural Principles

### 1. Separation Web / Native

Web and native are **independent apps** that share code through `commons/`. They have separate:

- Routing (TanStack Router vs Expo Router)
- UI components (shadcn/ui vs React Native components)
- oRPC clients (isomorphic SSR vs Bearer token)
- Store initialization (localStorage persist vs AsyncStorage)
- Build systems (Vite vs Metro/Expo)

They share through `commons/`:

- TypeScript types and interfaces
- Zustand store slice definitions (StateCreator pattern)
- Business constants and configuration
- The oRPC contract (type-safe API calls on both platforms)

### 2. Type Definitions Centralized

**All shared TypeScript types live in `commons/types/`** — never scattered across source files.

- `commons/types/db.ts` — Database entity interfaces, enum type aliases
- `commons/types/components.ts` — Shared component prop types
- `commons/store/types.ts` — State shape interfaces for all store slices

Type inference from Zod schemas (`z.infer<typeof schema>`) is the **only** place where types are derived inline, and this happens exclusively in `app/server/schemas/`.

### 3. No ORM — Raw SQL Only

Database access uses `@neondatabase/serverless` with tagged template literals:

```typescript
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

// Usage in services:
const result = await sql`
  SELECT id, name FROM utente WHERE id = ${userId}
`;
```

- No Prisma, no Drizzle, no TypeORM
- SQL is written directly in service files (`app/server/services/*.ts`)
- Database types are manually defined in `commons/types/db.ts`
- Error capture wraps queries and sends to Sentry

### 4. oRPC API Architecture

Type-safe RPC for both web and native clients.

**Server (procedures + services pattern):**

```
app/server/
├── router.ts          # Assembles all procedure groups
├── procedures/        # Define route, input/output schemas, call service
├── schemas/           # Zod schemas for validation + type inference
├── services/          # Business logic + raw SQL
└── middleware/         # Auth (Clerk session + Bearer token fallback)
```

**Procedure pattern:**

```typescript
// procedures/example.ts
export const myProcedure = authProcedure
  .route({ method: "POST", path: "/example/action", summary: "Do something" })
  .input(myInputSchema)
  .output(myOutputSchema)
  .handler(async ({ input, context }) => {
    return exampleService.doSomething(input, context.userId);
  });
```

**Web client (isomorphic — SSR direct call, browser HTTP):**

```typescript
// app/lib/orpc.ts
const client = createIsomorphicFn()
  .server(() => createRouterClient(appRouter, { context: async () => ({}) }))
  .client(() => createORPCClient(new RPCLink({ url: `/api/rpc` })));

export const orpc = createTanstackQueryUtils(client);
```

**Native client (Bearer token auth):**

```typescript
// native/lib/orpc.ts
const link = new RPCLink({
  url: `${API_BASE_URL}/api/rpc`,
  headers: async () => ({
    Authorization: `Bearer ${await getToken()}`
  })
});
```

**API endpoint:** `/api/rpc/*` — single catch-all route handled by `RPCHandler`.

### 5. Zod Schema Validation

All input/output validation uses Zod schemas in `app/server/schemas/`:

```
schemas/
├── common.ts     # Shared schemas (pagination, enums, entity shapes)
├── {domain}.ts   # One file per domain (quiz, errori, classifiche, etc.)
└── index.ts      # Re-exports all schemas
```

Schemas serve as **single source of truth** for both validation and TypeScript types via `z.infer<>`.

### 6. State Management — Zustand + Immer

**Store architecture:**

- Slice definitions in `commons/store/slices/` (shared between web & native)
- Store types in `commons/store/types.ts`
- Store instantiation in `app/store/index.ts` (web) or native equivalent

**Middleware chain:** `create(persist(immer(...slices)))`

- **Immer** — enables mutable-style state updates: `set(state => { state.foo = bar })`
- **Persist** — localStorage (web) / AsyncStorage (native) with custom merge
- **skipHydration** — manual rehydration for SSR compatibility

**Slice pattern (StateCreator):**

```typescript
export const createExampleSlice: StateCreator<
  AppState,
  [["zustand/immer", never]],
  [],
  ExampleSlice
> = (set) => ({
  someValue: defaultValue,
  setSomeValue: (val) =>
    set((state) => {
      state.someValue = val;
    })
});
```

### 7. UI — shadcn/ui + Tailwind CSS

**Web:**

- shadcn/ui components in `app/components/ui/` (installed via `npx shadcn@latest add`)
- Tailwind CSS 4 with `@tailwindcss/vite` plugin
- Dark mode: class-based
- CSS variables for design tokens (HSL colors, border-radius)
- Configuration in `tailwind.config.ts` and `components.json`
- Path aliases: `~/components/ui`, `~/lib/utils`

**Native:**

- Custom React Native components in `native/components/ui/`
- No Tailwind on native (standard StyleSheet or inline styles)
- Color tokens in `native/lib/colors.ts`

### 8. Authentication — Clerk

- Web: `@clerk/tanstack-react-start` with session cookies
- Native: `@clerk/clerk-expo` with `expo-secure-store` for token storage
- Italian locale: `@clerk/localizations` → `itIT`
- User sync: Clerk webhooks → database table
- Auth middleware supports both cookie sessions (web) and Bearer tokens (native/API)

**Server auth middleware pattern:**

1. Try `auth()` from Clerk middleware (web session cookies)
2. Fallback: extract Bearer token from Authorization header (native)
3. Verify token with `clerkClient().authenticateRequest()`
4. Return 401 if neither works

### 9. Database — Neon Serverless PostgreSQL

- Provider: Neon (`@neondatabase/serverless`)
- Connection: `DATABASE_URL` env var (PostgreSQL connection string with `?sslmode=require`)
- Client: `neon()` function returning tagged template SQL executor
- No migrations framework specified — manage schema externally or via Neon console

### 10. Monitoring — Sentry

- Server: `@sentry/tanstackstart-react` with `ORPCInstrumentation` for tracing
- Client: Sentry browser SDK with `tanstackRouterBrowserTracingIntegration`
- Vite plugin: `sentryTanstackStart` (source maps upload, last plugin in chain)
- Error filtering: expected errors (401, 403, 404, 400, 409) are NOT sent to Sentry
- Query errors: captured with contextual tags

### 11. Deploy — Netlify

- Adapter: `@netlify/vite-plugin-tanstack-start`
- Build: `pnpm run build` → `dist/client` (static) + `dist/server` (functions)
- Node version: 24
- CSP headers configured in `netlify.toml`
- Environment variables set in Netlify dashboard

### 12. Localization — i18n

Setup localization for both platforms:

- **Web (TanStack Start):** use a lightweight i18n solution compatible with SSR (e.g., `i18next` + `react-i18next` with TanStack Start loader, or `typesafe-i18n` for type-safe keys)
- **Native (Expo):** use `expo-localization` + same i18n library as web for shared translation keys
- **Shared translations** should live in `commons/locales/` or `commons/i18n/` so both platforms use identical keys and strings
- Clerk UI already supports locale configuration via `@clerk/localizations`

### 13. Dev Tools

- `@tanstack/react-devtools` — React component inspector
- `@tanstack/react-query-devtools` — Query cache inspector
- `@tanstack/react-router-devtools` — Router state inspector
- `@tanstack/devtools-vite` — Vite plugin for devtools integration
- All dev tools are development-only, tree-shaken in production

### 14. Testing — Vitest

```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // No need to import describe/it/expect
    environment: "jsdom", // DOM environment
    setupFiles: ["./tests/setup.ts"]
  },
  resolve: {
    alias: { "~": "./app", "@": "." }
  }
});
```

- Test runner: `vitest`
- DOM: `jsdom`
- Matchers: `@testing-library/jest-dom`
- React testing: `@testing-library/react`
- Tests in `/tests/` directory

---

## Manager Architecture — Business Logic Layer

All algorithmic/scientific business logic is centralized in **Managers** — pure functions in `commons/utils/` with declarative configuration from `local_data/`. The client (store, components) is a thin UI layer. Managers are exposed via **oRPC procedures** under authentication.

### Architecture

```
CLIENT (React/Expo) → oRPC API (auth) → Manager (pure function) → Config (local_data/)
```

- **Client** = UI + local state (Zustand). Imports `format.ts` for display helpers only.
- **Server** = oRPC procedures call Managers directly (no ORM, no side effects).
- **Managers** = pure functions. Input → output. No DB, no state, no side effects.
- **Config** = declarative TS/JSON in `local_data/`. Scientific constants, ranges, catalogs.

### Manager Inventory (12 total)

| Manager | File | Domain | Config |
|---------|------|--------|--------|
| **DoughManager** | `dough-manager.ts` | Blend, yeast (Formula L), temperature, composition warnings | `dough-defaults.ts` |
| **FlourManager** | `flour-manager.ts` | Catalog lookup, blending, W estimation, classification | `flour-catalog.ts` |
| **RiseManager** | `rise-manager.ts` | Duration (W + yeast + method + temp), Q10 factor | `rise-methods.ts` |
| **PreFermentManager** | `pre-ferment-manager.ts` | Biga/poolish/madre ingredient calc, dough adjustment | `dough-defaults.ts` |
| **BakeManager** | `bake-manager.ts` | 7 cooking methods, duration, validation, warnings | `baking-profiles.ts`, `fat-catalog.ts` |
| **PreBakeManager** | `pre-bake-manager.ts` | 9 pre-bake subtypes, validation, suggestions | inline enums |
| **AdvisoryManager** | `advisory-manager.ts` | Declarative rule engine (conditions, exclude, suppress) | `advisory-rules.ts` |
| **PortioningManager** | `portioning-manager.ts` | Target weight, scaling, hydration sync | `tray-presets.ts` |
| **GraphManager** | `graph-manager.ts` | Add/remove nodes, topology, validation, sort | `step-types.ts` |
| **ScheduleManager** | `schedule-manager.ts` | Timeline, parallel phases, total duration | — |
| **IngredientManager** | `ingredient-manager.ts` | Grouped totals, aggregation | `ingredient-presets.ts` |
| **FormatUtils** | `format.ts` | `rnd`, `fmtDuration`, `fmtTime`, temperature conversion | — (pure helpers) |

### Dependency Hierarchy

```
format.ts (lowest — no deps)
  ↑
flour-manager.ts → FlourCatalog
  ↑
dough-manager.ts → DoughDefaults
  ↑
rise-manager.ts → RiseMethods
pre-ferment-manager.ts
portioning-manager.ts
  ↑
graph-reconciler.service.ts (orchestrator — calls all managers)
```

### How to Create a New Manager

1. **Create the manager** in `commons/utils/{domain}-manager.ts`:
   - Export ONLY pure functions (no side effects, no DB, no state)
   - Import config from `local_data/{domain}-config.ts`
   - Document scientific references in JSDoc (`[C] Cap. XX`, `[M] Section`)
   - Follow the pattern: `getDefaultConfig()`, `calculate()`, `validate()`, `getWarnings()`

2. **Create the config** in `local_data/{domain}-config.ts`:
   - Declarative arrays/objects with scientific parameters
   - Use `as const satisfies ReadonlyArray<Type>` for type safety
   - Include source citations in comments

3. **Create oRPC procedure** in `app/server/procedures/{domain}.ts`:
   - Use `baseProcedure` (no auth) for pure calculations
   - Use `authProcedure` for user-specific operations
   - Handler = thin wrapper calling the manager

4. **Create Zod schemas** in `app/server/schemas/{domain}.ts`:
   - Input/output schemas for each procedure
   - Keep intentionally loose for flexibility (manager handles validation)

5. **Register in router** (`app/server/router.ts`):
   ```typescript
   import { action1, action2 } from './procedures/{domain}'
   // In appRouter:
   {domain}: os.router({ action1, action2 }),
   ```

6. **Write tests** in `tests/{domain}-manager.test.ts`:
   - Test every public function
   - Test edge cases (empty input, zero values, extremes)
   - Verify scientific formulas against literature
   - Use existing helpers from `tests/synthetic_data/helpers.ts`

7. **Client usage**:
   - Display helpers → import from `@commons/utils/format`
   - Business logic → via oRPC (`orpc.{domain}.{action}.useQuery()`)
   - Static catalogs → direct import from `@/local_data/` (staleTime: Infinity)

### When to Create a Manager vs. Inline Logic

**Create a Manager when:**
- Logic involves scientific formulas or domain constants
- Logic is shared between web and native
- Logic has configurable parameters (ranges, thresholds, profiles)
- Logic needs validation and warnings

**Keep inline when:**
- Pure UI formatting (use `format.ts`)
- One-off component logic that won't be reused
- Simple derivations from existing state

### Scientific Validation

Every formula in a Manager MUST reference its scientific source:
- **[C]** = Casucci "La Pizza è un Arte" (2020) — chapters 01-69
- **[M]** = Modernist Pizza Vol. 4 — sections by topic
- Use the `bread-knowledge` skill to verify formulas against literature

---

## BreadScience JSON — Externalized Scientific Logic

### Philosophy

**Zero hardcoded science in code.** All baking knowledge — formulas, thresholds, factor chains, classification rules, advisory conditions, catalog data — lives in declarative JSON files under `/science/`. The TypeScript Managers are pure execution engines: they receive logic from a `ScienceProvider`, evaluate it via `expr-eval`, and return results. This separation enables:

- **Non-developers can edit baking science** (via admin panel or JSON files) without touching code
- **Multiple formula variants** coexist (e.g., Casucci Formula L vs Q10 model for yeast) — the user or system chooses
- **i18n is decoupled** — `/science/` contains only logic keys (`messageKey`), human text lives in `/i18n/`
- **Future DB migration** — swap `FileScienceProvider` for `DbScienceProvider` without changing any Manager
- **Auditable** — every formula cites its scientific source (`ref: "[C] Cap. 44"`)

### How it works

```
/science/*.json                 /i18n/{locale}/science.json
     │ (logic)                       │ (text)
     ▼                               ▼
ScienceProvider ──────────────► Manager.*Science()
     │                               │
     ▼                               ▼
FormulaEngine (expr-eval)       RuleEngine (conditions)
     │                               │
     ▼                               ▼
{ result: 0.172 }               { messageKey, messageVars, actions }
                                     │
                                     ▼
                                Client: t(messageKey, vars) → localized text
```

**Dual API**: Each Manager exposes both the original hardcoded function (e.g., `calcYeastPct()`) and a Science-aware version (e.g., `calcYeastPctScience(provider, ...)`). Snapshot tests guarantee identical results. The hardcoded versions remain for backward compatibility and as a fallback.

All scientific formulas, rules, thresholds, and catalogs are stored as JSON in `/science/`. Text messages are in `/i18n/` (EN base + IT current).

### Structure

```
/science/
├── schema/breadscience.schema.json   ← JSON Schema validation
├── formulas/                         ← formula, factor_chain blocks
├── rules/                            ← rule blocks (messageKey, no text)
├── catalogs/                         ← catalog blocks (flours, fats, etc.)
├── defaults/                         ← defaults blocks (per type/subtype)
└── classifications/                  ← piecewise, classification blocks

/i18n/
├── en/science.json                   ← English (base)
└── it/science.json                   ← Italian (current)
```

### Block types

| Type | Purpose | Example |
|------|---------|---------|
| `formula` | Math expression (expr-eval) | `K / (REF_HYD * tempC^2 * hours)` |
| `factor_chain` | Multiplicative: base × f1 × f2 × ... | Rise duration (11 factors) |
| `piecewise` | Step function | W > 380 → 20h |
| `classification` | Categorization | W → weak/medium/strong |
| `rule` | Advisory/warning with conditions + actions | Steam too long → split phases |
| `catalog` | Data table | 28 flour types |
| `defaults` | Per-type/subtype config | Pizza napoletana salt 2.3% |

### Key principles

- **No text in `/science/`** — only `messageKey`, `labelKey`, `titleKey` pointing to `/i18n/`
- **Formulas can have `variants`** — alternative scientific approaches (e.g., Formula L vs Q10)
- **Rules can have `selectionMode: "choose_one"`** — alternative strategies for the user
- **ScienceProvider** is abstract — `FileScienceProvider` (today), `DbScienceProvider` (future)
- **Admin panel** at `/admin/science` — list, view, edit blocks and i18n keys (auth + admin role)

### Rule engine — advisory & warnings

The rule engine (`commons/utils/science/rule-engine.ts`) evaluates declarative rules against a context object. It is an evolution of the original `advisory-manager.ts` with these improvements:

- **Returns `messageKey` + `messageVars`** — never resolved text. The client resolves via i18n.
- **`selectionMode: "choose_one"`** — actions as alternative strategies (radio select), not just independent buttons.
- **`variants`** on formulas — alternative scientific approaches with `applicability` ranges for auto-suggestion.
- **`_meta`** on every block — section, displayName, description, tags for the admin panel.

### Admin panel — `/admin/science`

Protected route (auth + admin role via Clerk `sessionClaims`). Three pages:

- **Dashboard** (`/admin/science`) — lists all science blocks grouped by `_meta.section`, with type badges and tags
- **Rule detail** (`/admin/science/rules/$id`) — shows full block structure: expression, variants, constants, conditions, actions, factors, raw JSON
- **i18n editor** (`/admin/science/i18n`) — side-by-side EN/IT key viewer

Admin oRPC procedures: `science.listBlocks`, `science.getBlock`, `science.updateBlock`, `science.listI18n`, `science.updateI18n` — all behind `authProcedure`.

### Adding new science

1. Create JSON file in appropriate `/science/` subdirectory
2. Follow `breadscience.schema.json` format
3. Add i18n keys to `/i18n/en/science.json` and `/i18n/it/science.json`
4. Add `_meta` with section, displayName, description, tags
5. Add `*Science()` function to the relevant Manager
6. Write snapshot test comparing Science vs hardcoded results
7. The new block will automatically appear in the admin panel dashboard

---

## Configuration Files

### Path Aliases

| Alias        | Resolves To          | Used In               |
| ------------ | -------------------- | --------------------- |
| `~/*`        | `./app/*`            | Web app imports       |
| `@/*`        | `./*`                | Root-relative imports |
| `@commons/*` | `./commons/*`        | Shared code imports   |
| `@commons`   | `./commons/index.ts` | Commons barrel import |

Defined in both `tsconfig.json` (for IDE/TS) and `vite.config.ts` (for bundler).
Native has its own `tsconfig.json` with `@commons` alias.

### Environment Variables

**Web (`.env`):**

```
DATABASE_URL=postgresql://...?sslmode=require
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_SIGN_IN_URL=/sign-in
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
VITE_IMAGE_PREFIX_PATH=https://...
ABLY_API_KEY=...
SENTRY_AUTH_TOKEN=...
VITE_SENTRY_DSN=https://...
```

**Native (`.env`):**

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_API_BASE_URL=https://your-domain.com
```

Prefix convention:

- `VITE_` — exposed to client bundle (web)
- `EXPO_PUBLIC_` — exposed to native bundle
- No prefix — server-only secrets

### pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - "." # Root (web app)
  - "commons" # Shared code
  - "native" # Mobile app
```

---

## Coding Conventions

### General

- **TypeScript strict mode** everywhere (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- **ES2022** target, **ESNext** modules, **bundler** module resolution
- **pnpm** as package manager (never npm or yarn)
- **Latest versions** of all packages — always use the most recent stable releases
- **React 19** with JSX automatic transform

### File Organization

- One domain = one procedure file + one schema file + one service file
- Components organized by domain in subdirectories under `components/`
- UI primitives (shadcn) in `components/ui/`
- Hooks in `hooks/` directory
- Types centralized in `commons/types/` — **never define types inline in source files**

### API Layer

- Procedures: thin — validate input, call Manager or service, return output
- Managers: pure functions — all algorithmic/scientific business logic (no DB, no side effects)
- Services: DB operations — raw SQL queries, error handling, user-specific data
- Schemas: Zod — single source of truth for types + validation
- Auth: middleware-based, never checked inside Manager or service functions

### State Management

- All state mutations through Immer (mutable syntax, immutable result)
- Store slices defined in commons, instantiated per-platform
- Persist only necessary state (use `partialize`)
- SSR-safe with `skipHydration` + manual rehydration

### Naming

- Route files: kebab-case matching URL segments
- Components: PascalCase files and exports
- Utilities/libs: camelCase files
- Types: PascalCase interfaces, camelCase for type aliases of primitives
- Schemas: camelCase with `Schema` suffix (e.g., `generateQuizInputSchema`)
- Managers: `{domain}-manager.ts` — pure functions, no class needed
- Services: `{domain}.service.ts` with class or namespace pattern (DB operations only)

---

## Quick Start for New Project

1. **Init monorepo:** `pnpm init` + create `pnpm-workspace.yaml` with `".", "commons", "native"`
2. **Setup web:** TanStack Start + Vite 8 + React 19
3. **Setup native:** Expo 55 + Expo Router
4. **Setup commons:** Private workspace package, re-export types/store/constants
5. **Add oRPC:** Server router + procedures + schemas, isomorphic client (web), Bearer client (native)
6. **Add auth:** Clerk with both web and native adapters
7. **Add DB:** Neon serverless client, raw SQL, types in commons
8. **Add state:** Zustand + Immer, slices in commons, platform-specific init
9. **Add UI:** shadcn/ui + Tailwind CSS 4 (web), custom components (native)
10. **Add monitoring:** Sentry with framework-specific integrations
11. **Add testing:** Vitest + @testing-library/react + jsdom
12. **Configure deploy:** Netlify adapter for TanStack Start
13. **Add i18n:** Shared translations in commons, platform-specific loaders
14. **Add dev tools:** TanStack devtools suite (Vite plugin + React/Query/Router devtools)
