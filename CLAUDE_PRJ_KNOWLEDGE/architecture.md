# Key Architectural Principles

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

**Languages**: base `en`, default/current `it`.

**Shared translations** in `commons/i18n/{locale}/{namespace}.json`:
```
commons/i18n/
├── en/
│   ├── common.json     ← UI labels, buttons, navigation
│   ├── recipe.json     ← Recipe domain labels
│   └── science.json    ← Science formulas, warnings, advisories
└── it/
    ├── common.json
    ├── recipe.json
    └── science.json
```

**File format**: i18next syntax (`{{variable}}`) — compatible with both Paraglide (via plugin) and react-i18next.

**Web (TanStack Start)**: Zustand locale slice + `useT()` hook
- Locale state in `commons/store/slices/locale.ts` (shared web+native, persisted)
- `useT()` hook (`app/hooks/useTranslation.ts`) — reactive translation function
- `useLocale()` / `useSetLocale()` — read/write current locale
- All JSON files statically imported, merged per locale — zero runtime fetch
- Changing locale triggers instant re-render of all `useT()` consumers (no page reload)
- Cookie `PARAGLIDE_LOCALE` persisted as side-effect for SSR
- Language switcher: IT/EN buttons in `app/components/layout/Header.tsx`
- `<html lang>` dynamically set via `useLocale()` in `__root.tsx`
- Paraglide JS Vite plugin configured (`project.inlang/settings.json`) for future type-safe `m.key()` usage

**Native (Expo)**: react-i18next + expo-localization (planned)
- Same JSON files from `commons/i18n/`
- Same Zustand locale slice
- Device locale detection via `expo-localization`

**Clerk UI**: `<ClerkProvider localization={clerkLocales[locale]}>` — dynamically switches between `itIT` and English based on Zustand locale.

**Science domain**: all warnings, advisories, and actions use `messageKey` pointing to `commons/i18n/`. Science JSON files (`/science/`) never contain human text — only i18n keys.

**Catalog domain**: all local_data/ catalog labels use `labelKey` pointing to `commons/i18n/{locale}/catalog.json`. See section "Local Data Norms" below.

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
