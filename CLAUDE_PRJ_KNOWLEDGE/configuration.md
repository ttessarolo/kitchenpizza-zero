# Configuration Files

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
