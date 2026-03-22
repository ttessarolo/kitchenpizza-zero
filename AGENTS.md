<!-- intent-skills:start -->
# Skill mappings - when working in these areas, load the linked skill file into context.
skills:
  # TanStack Start core
  - task: "Setting up or configuring TanStack Start, Vite plugin, root route, entry points"
    load: "node_modules/.pnpm/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/SKILL.md"

  - task: "Deploying to Netlify, SSR configuration, static prerendering, SPA mode"
    load: "node_modules/.pnpm/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/deployment/SKILL.md"

  - task: "Server functions, createServerFn, createIsomorphicFn, environment boundaries, client/server code splitting"
    load: "node_modules/.pnpm/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/execution-model/SKILL.md"

  - task: "Start middleware, createMiddleware, request middleware, global middleware in start.ts"
    load: "node_modules/.pnpm/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/middleware/SKILL.md"

  - task: "createServerFn, server function validation, streaming, FormData, server context utilities"
    load: "node_modules/.pnpm/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/server-functions/SKILL.md"

  - task: "API routes, server-side HTTP endpoints, createHandlers, request/response handling"
    load: "node_modules/.pnpm/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/server-routes/SKILL.md"

  # TanStack Start server runtime
  - task: "createStartHandler, server request/response utilities, setCookie, getCookie, useSession, AsyncLocalStorage"
    load: "node_modules/.pnpm/@tanstack+start-server-core@1.167.2/node_modules/@tanstack/start-server-core/skills/start-server-core/SKILL.md"

  # TanStack Router core
  - task: "Router setup, route trees, createRouter, createRoute, createRootRoute, file-based routing conventions"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/SKILL.md"

  - task: "Route protection, auth guards, beforeLoad redirects, Clerk integration with router, RBAC"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/auth-and-guards/SKILL.md"

  - task: "Code splitting routes, lazy loading, autoCodeSplitting, .lazy.tsx files"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/code-splitting/SKILL.md"

  - task: "Route loaders, data loading, staleTime caching, pendingComponent, beforeLoad context, deferred data"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/data-loading/SKILL.md"

  - task: "Link component, useNavigate, navigation options, preloading, scroll restoration, navigation blocking"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/navigation/SKILL.md"

  - task: "404 pages, notFound(), error boundaries, errorComponent, route masking"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/not-found-and-errors/SKILL.md"

  - task: "Dynamic route params, $paramName segments, splat routes, optional params"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/path-params/SKILL.md"

  - task: "Search params validation, Zod search schemas, retainSearchParams, stripSearchParams, search middleware"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/search-params/SKILL.md"

  - task: "SSR rendering, streaming, HeadContent, Scripts, head meta/links, dehydration/hydration"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/ssr/SKILL.md"

  - task: "Router type safety, Register declaration, from narrowing, getRouteApi, LinkProps types"
    load: "node_modules/.pnpm/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/type-safety/SKILL.md"
<!-- intent-skills:end -->
