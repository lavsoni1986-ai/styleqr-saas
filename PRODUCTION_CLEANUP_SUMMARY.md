# Production Cleanup Summary

## Files Cleaned

### Console → Logger (server-side)
| File | Changes |
|------|---------|
| `src/lib/env-validation.ts` | `console.warn` → `logger.warn` |
| `src/lib/audit-log.ts` | `console.warn/error` → `logger.warn/error` |
| `src/lib/api-error-handler.ts` | `console.error` → `logger.error` |
| `src/lib/get-district-from-host.ts` | `console.error` → `logger.error` |
| `src/lib/auth-config.ts` | `console.error` → `logger.error` |
| `src/lib/auth.ts` | `console.error` → `logger.error` |
| `src/lib/prisma.server.ts` | `console.log` → `logger.debug` |
| `src/lib/test-mode.ts` | `console.log` → `logger.info` |
| `src/app/api/admin/menu-items/[id]/route.ts` | `console.error` → `logger.error` |
| `src/app/api/admin/orders/[id]/route.ts` | `console.log/warn/error` → `logger.info/warn/error` |
| `src/app/api/platform/districts/route.ts` | `console.error` → `logger.error` |
| `src/app/api/auth/login/route.ts` | `console.error` → `logger.error` |
| `src/app/api/auth/signup/route.ts` | `console.error` → `logger.error` |

### Client Logger Added
- `src/lib/client-logger.ts` – No-op / Sentry-only client logger (no console in production)

## Dead Code Removed

- Legacy "Legacy login API" comment → "Programmatic login API" (auth/login)

## Env Variables Cleaned

| Variable | Status |
|----------|--------|
| `JWT_SECRET` | Legacy – health check only; NEXTAUTH_SECRET is primary |
| `JWT_EXPIRES_IN` | Unused by NextAuth; removed from env template |
| `SENTRY_DSN` | Required in production (env-validation) |

## Logger Usage

- Server: `logger.info/warn/error/debug` (structured, redacted)
- Client: `clientLogger.error` (Sentry when available; no console)
- Sensitive keys redacted: password, token, secret, authorization, cookie, apiKey, stripe, sk_, pk_, whsec_

## Dev-Only Routes

- `/api/internal/*` – Protected by `INTERNAL_API_SECRET`; dev bypass only when `NODE_ENV=development`
- `/api/health` – Public (no auth)

## Dependency Status

- All deps from `package.json` in use
- No unused packages removed (audit not run)

## Build Success

```
✓ Compiled successfully
✓ Generating static pages
```

## Runtime Test

- `next start` runs successfully
- Proxy returns 200 for `/` and `/api/health`
- Structured logs: `{"level":"info","requestId":"...","route":"/","latency":2,"msg":"Proxy 200"}`

**Note:** `node server.js` assumes `server.original.js` from standalone output. Use `node .next/standalone/server.js` when deployed from standalone, or `next start` for local testing.
