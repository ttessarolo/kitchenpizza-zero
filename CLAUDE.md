# Project Architecture & Conventions

## Overview

Monorepo full-stack application with **web** (TanStack Start) and **native mobile** (Expo/React Native) clients sharing a common codebase. Type-safe RPC API layer, raw SQL on serverless PostgreSQL, immutable state management.

**Stack:** TypeScript, pnpm workspaces, Vite 8, React 19, Expo 55, Zod 4, oRPC, Zustand + Immer, Tailwind CSS 4, shadcn/ui, Neon (serverless PostgreSQL), Clerk auth, Sentry monitoring, Netlify deploy.

**Web Part**
Il progetto web è MOBILE first.
Usa shadcn per le componenti.
Usa Tailwind per gli stili.
(tutti in ultima versione)

### ⚠️ i18n OBBLIGATORIO — NESSUNA ECCEZIONE

**TUTTI i testi visibili all'utente DEVONO usare `t('key')` o `t('key', { var: value })`.**
Mai stringhe hardcoded in JSX, titoli, placeholder, tooltip, bottoni, dialog, label, messaggi di errore.
Questo vale per OGNI file: componenti, dialog, toast, alert, tooltip.
Se crei un nuovo testo, aggiungi SEMPRE la chiave in `commons/i18n/it/*.json` E `commons/i18n/en/*.json`.

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

---

## Project Knowledge (Progressive Discovery)

<!-- Read these files ONLY when working in the specific area. Do NOT read them all upfront. -->

<!-- Detailed architecture: oRPC, Zustand, Clerk, Neon, Sentry, i18n, deploy, testing (sections 1-14) -->
<!-- → CLAUDE_PRJ_KNOWLEDGE/architecture.md -->

<!-- Manager pattern, inventory, dependency hierarchy, how to create a new one -->
<!-- → CLAUDE_PRJ_KNOWLEDGE/managers.md -->

<!-- RecipeAutoCorrectManager: iterative constraint solver, priority tiers, mutation engine -->
<!-- → CLAUDE_PRJ_KNOWLEDGE/auto-correct.md -->

<!-- CookingScienceBrain: /science/ JSON, ScienceProvider, rule engine, admin panel, mandatory integration for ALL managers -->
<!-- → CLAUDE_PRJ_KNOWLEDGE/science-brain.md -->

<!-- Cross-node scientific validation: checklist for new node types, constraints table per node type -->
<!-- → CLAUDE_PRJ_KNOWLEDGE/cross-node-validation.md -->

<!-- Local Data Norms: labelKey pattern, DataProvider, i18n key naming, DB migration path -->
<!-- → CLAUDE_PRJ_KNOWLEDGE/local-data-norms.md -->

<!-- Path aliases, environment variables, pnpm workspace config -->
<!-- → CLAUDE_PRJ_KNOWLEDGE/configuration.md -->
