# Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full monorepo (web + native + commons) per CLAUDE.md architecture.

**Architecture:** pnpm monorepo with three workspaces: root (web app with TanStack Start), `commons/` (shared types/store/constants), `native/` (Expo app). oRPC API layer, Neon DB, Clerk auth, Zustand+Immer state, shadcn/ui, Sentry monitoring, Netlify deploy.

**Tech Stack:** TypeScript, pnpm, Vite 8, React 19, TanStack Start/Router, Expo 55, Zod 4, oRPC, Zustand, Immer, Tailwind CSS 4, shadcn/ui, Neon, Clerk, Sentry, Vitest.

---

## File Structure

```
/
├── package.json                    # Root workspace — all shared deps
├── pnpm-workspace.yaml            # Workspace config
├── tsconfig.json                   # Root TS config (strict, ES2022)
├── vite.config.ts                  # Vite 8 config (plugins, aliases)
├── vitest.config.ts                # Vitest config
├── tailwind.config.ts              # Tailwind config
├── components.json                 # shadcn/ui config
├── netlify.toml                    # Netlify deploy config
├── app.config.ts                   # TanStack Start config
├── .gitignore                      # Git ignore rules
├── .env                            # Environment variables (exists)
├── .env.example                    # Env template
│
├── app/                            # Web application
│   ├── routes/
│   │   ├── __root.tsx              # Root layout
│   │   ├── index.tsx               # Landing page
│   │   ├── api/
│   │   │   └── rpc.$.ts            # oRPC catch-all endpoint
│   │   ├── sign-in/
│   │   │   └── $.tsx               # Sign-in route
│   │   ├── sign-up/
│   │   │   └── $.tsx               # Sign-up route
│   │   └── main/
│   │       └── route.tsx           # Protected layout
│   ├── server/
│   │   ├── router.ts              # oRPC router
│   │   ├── procedures/
│   │   │   └── health.ts          # Health check procedure
│   │   ├── schemas/
│   │   │   └── common.ts          # Shared schemas
│   │   ├── services/
│   │   │   └── health.service.ts  # Health check service
│   │   └── middleware/
│   │       └── auth.ts            # Auth middleware
│   ├── components/
│   │   └── ui/                    # shadcn/ui (empty, ready for install)
│   ├── store/
│   │   ├── index.ts               # Store creation
│   │   └── slices/                # Re-exports from commons
│   ├── lib/
│   │   ├── db.ts                  # Neon client
│   │   ├── orpc.ts                # Isomorphic oRPC client
│   │   ├── auth.ts                # Auth helpers
│   │   └── utils.ts               # General utils (cn function)
│   ├── types/                     # Web-specific types
│   ├── styles/
│   │   └── globals.css            # Tailwind CSS
│   ├── hooks/                     # Custom hooks
│   ├── icons/                     # SVG icons
│   ├── start.ts                   # TanStack Start init
│   ├── router.tsx                 # Router creation
│   └── sentry.server.ts          # Sentry server init
│
├── commons/
│   ├── package.json               # Private workspace package
│   ├── tsconfig.json              # Commons TS config
│   ├── index.ts                   # Central re-export
│   ├── types/
│   │   ├── db.ts                  # Database entity interfaces
│   │   └── components.ts          # Shared component types
│   ├── store/
│   │   ├── types.ts               # State interfaces
│   │   └── slices/
│   │       ├── ui.ts              # UI state slice
│   │       └── version.ts         # App version slice
│   └── constants/
│       └── index.ts               # Shared constants
│
├── native/
│   ├── package.json               # Native dependencies
│   ├── tsconfig.json              # Native TS config
│   ├── app.json                   # Expo config
│   ├── app/
│   │   ├── _layout.tsx            # Root layout
│   │   ├── index.tsx              # Initial redirect
│   │   ├── (auth)/
│   │   │   └── sign-in.tsx        # Sign-in screen
│   │   └── (app)/
│   │       ├── _layout.tsx        # App layout with auth guard
│   │       └── home.tsx           # Home screen
│   ├── components/
│   │   └── ui/                    # Native UI primitives
│   └── lib/
│       ├── orpc.ts                # Native oRPC client
│       ├── orpc-context.tsx       # oRPC React context
│       ├── colors.ts              # Color tokens
│       └── format.ts              # Formatting utils
│
└── tests/
    └── setup.ts                   # Test setup
```

---

### Task 1: Initialize monorepo root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `tsconfig.json`

- [ ] **Step 1: Create `.gitignore`**

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

- [ ] **Step 3: Create root `package.json`**

- [ ] **Step 4: Create root `tsconfig.json`**

- [ ] **Step 5: Create `.env.example`**

- [ ] **Step 6: Fix `.env` variable names** (rename `CLERK_PUBLISHABLE_KEY` → `VITE_CLERK_PUBLISHABLE_KEY`, add `CLERK_SIGN_IN_URL`)

- [ ] **Step 7: Commit**

```bash
git add .gitignore pnpm-workspace.yaml package.json tsconfig.json .env.example
git commit -m "chore: init monorepo root with pnpm workspaces"
```

---

### Task 2: Setup commons workspace

**Files:**
- Create: `commons/package.json`
- Create: `commons/tsconfig.json`
- Create: `commons/index.ts`
- Create: `commons/types/db.ts`
- Create: `commons/types/components.ts`
- Create: `commons/store/types.ts`
- Create: `commons/store/slices/ui.ts`
- Create: `commons/store/slices/version.ts`
- Create: `commons/constants/index.ts`

- [ ] **Step 1: Create commons package.json**
- [ ] **Step 2: Create commons tsconfig.json**
- [ ] **Step 3: Create types stubs**
- [ ] **Step 4: Create store types and slices**
- [ ] **Step 5: Create constants**
- [ ] **Step 6: Create barrel export**
- [ ] **Step 7: Commit**

---

### Task 3: Setup web app (TanStack Start + Vite 8 + React 19)

**Files:**
- Create: `app.config.ts`
- Create: `vite.config.ts`
- Create: `app/start.ts`
- Create: `app/router.tsx`
- Create: `app/routes/__root.tsx`
- Create: `app/routes/index.tsx`
- Create: `app/lib/utils.ts`
- Create: `app/styles/globals.css`

- [ ] **Step 1: Install core web dependencies**

```bash
pnpm add react react-dom @tanstack/react-start @tanstack/react-router vinxi vite
pnpm add -D typescript @types/react @types/react-dom vite
```

- [ ] **Step 2: Create TanStack Start config files**
- [ ] **Step 3: Create root layout + index route**
- [ ] **Step 4: Create styles and utils**
- [ ] **Step 5: Verify dev server starts**
- [ ] **Step 6: Commit**

---

### Task 4: Add Tailwind CSS 4 + shadcn/ui

**Files:**
- Create: `tailwind.config.ts`
- Create: `components.json`
- Modify: `app/styles/globals.css`
- Modify: `vite.config.ts` (add tailwind plugin)

- [ ] **Step 1: Install Tailwind CSS 4**
- [ ] **Step 2: Configure Tailwind**
- [ ] **Step 3: Setup shadcn/ui config**
- [ ] **Step 4: Install a base shadcn component (button)**
- [ ] **Step 5: Commit**

---

### Task 5: Add Neon database client

**Files:**
- Create: `app/lib/db.ts`

- [ ] **Step 1: Install `@neondatabase/serverless`**
- [ ] **Step 2: Create db client module**
- [ ] **Step 3: Commit**

---

### Task 6: Add oRPC API layer

**Files:**
- Create: `app/server/middleware/auth.ts`
- Create: `app/server/schemas/common.ts`
- Create: `app/server/services/health.service.ts`
- Create: `app/server/procedures/health.ts`
- Create: `app/server/router.ts`
- Create: `app/routes/api/rpc.$.ts`
- Create: `app/lib/orpc.ts`

- [ ] **Step 1: Install oRPC packages**
- [ ] **Step 2: Create auth middleware**
- [ ] **Step 3: Create health check procedure (schema + service + procedure)**
- [ ] **Step 4: Create router**
- [ ] **Step 5: Create API route handler**
- [ ] **Step 6: Create isomorphic client**
- [ ] **Step 7: Commit**

---

### Task 7: Add Clerk authentication

**Files:**
- Create: `app/lib/auth.ts`
- Create: `app/routes/sign-in/$.tsx`
- Create: `app/routes/sign-up/$.tsx`
- Create: `app/routes/main/route.tsx`
- Modify: `app/start.ts` (add Clerk middleware)
- Modify: `app/routes/__root.tsx` (add ClerkProvider)

- [ ] **Step 1: Install Clerk packages**
- [ ] **Step 2: Configure Clerk middleware in start.ts**
- [ ] **Step 3: Add ClerkProvider to root layout**
- [ ] **Step 4: Create auth routes**
- [ ] **Step 5: Create protected route layout**
- [ ] **Step 6: Create auth helpers**
- [ ] **Step 7: Commit**

---

### Task 8: Add Zustand + Immer state management

**Files:**
- Create: `app/store/index.ts`
- Create: `app/store/slices/index.ts`

- [ ] **Step 1: Install zustand + immer**
- [ ] **Step 2: Create web store with persist + immer middleware**
- [ ] **Step 3: Create slice re-exports**
- [ ] **Step 4: Commit**

---

### Task 9: Add Sentry monitoring

**Files:**
- Create: `app/sentry.server.ts`
- Modify: `app/router.tsx` (add Sentry browser integration)
- Modify: `vite.config.ts` (add Sentry plugin)

- [ ] **Step 1: Install Sentry packages**
- [ ] **Step 2: Create server Sentry config**
- [ ] **Step 3: Add client Sentry to router**
- [ ] **Step 4: Add Sentry Vite plugin**
- [ ] **Step 5: Commit**

---

### Task 10: Add Vitest testing setup

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Install vitest + testing-library**
- [ ] **Step 2: Create vitest config**
- [ ] **Step 3: Create test setup file**
- [ ] **Step 4: Commit**

---

### Task 11: Add Netlify deploy config

**Files:**
- Create: `netlify.toml`
- Modify: `vite.config.ts` (add Netlify adapter)

- [ ] **Step 1: Install Netlify adapter**
- [ ] **Step 2: Create netlify.toml**
- [ ] **Step 3: Commit**

---

### Task 12: Add TanStack dev tools

- [ ] **Step 1: Install devtools packages**
- [ ] **Step 2: Add devtools to root layout (dev only)**
- [ ] **Step 3: Add Vite devtools plugin**
- [ ] **Step 4: Commit**

---

### Task 13: Setup Expo native app

**Files:**
- Create: `native/package.json`
- Create: `native/tsconfig.json`
- Create: `native/app.json`
- Create: `native/app/_layout.tsx`
- Create: `native/app/index.tsx`
- Create: `native/app/(auth)/sign-in.tsx`
- Create: `native/app/(app)/_layout.tsx`
- Create: `native/app/(app)/home.tsx`
- Create: `native/lib/orpc.ts`
- Create: `native/lib/orpc-context.tsx`
- Create: `native/lib/colors.ts`
- Create: `native/lib/format.ts`

- [ ] **Step 1: Create native package.json with Expo 55 deps**
- [ ] **Step 2: Create Expo config**
- [ ] **Step 3: Create native TS config**
- [ ] **Step 4: Create root layout with Clerk provider**
- [ ] **Step 5: Create auth screens**
- [ ] **Step 6: Create app screens with auth guard**
- [ ] **Step 7: Create native oRPC client**
- [ ] **Step 8: Create utility modules**
- [ ] **Step 9: Commit**

---

### Task 14: Install all dependencies + verify

- [ ] **Step 1: Run `pnpm install`**
- [ ] **Step 2: Run `pnpm tsc --noEmit` to check types**
- [ ] **Step 3: Run dev server to verify startup**
- [ ] **Step 4: Final commit**
