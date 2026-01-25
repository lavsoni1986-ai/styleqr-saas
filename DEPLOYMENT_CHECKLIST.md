# StyleQR — Deployment Checklist

Production deployment steps for StyleQR SaaS.

---

## 1. Environment

- [ ] **Node.js 20.x** (LTS). `engines`: `>=20.0.0 <21.0.0`. Run `node -v`.
- [ ] **`.env`** in project root (never commit).

Required:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?connection_limit=20&connect_timeout=10"
JWT_SECRET="<min 32 chars, use: openssl rand -base64 32>"
```

Optional:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
# Cloudinary (menu images):
# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
```

- [ ] `JWT_SECRET` must be set; `auth.edge` throws on empty.
- [ ] `DATABASE_URL` must point to a running PostgreSQL instance.

---

## 2. Database

- [ ] PostgreSQL created and reachable.
- [ ] `npx prisma generate`
- [ ] `npx prisma migrate deploy`
- [ ] (Optional) Seed: `npm run seed:admin` for super admin; create `RESTAURANT_OWNER` and restaurant via signup or seed.

---

## 3. Build & Start

- [ ] `npm run build` — must succeed.
- [ ] `npm run start` — default port 3000. If in use: `PORT=3001 npm run start` or `next start -p 3001`.
- [ ] For LAN: `npm run start:lan` (binds `0.0.0.0`). Ensure firewall allows the port.

---

## 4. Proxy / Process Manager

- [ ] Run behind reverse proxy (e.g. Nginx) for TLS and `X-Forwarded-Proto`, `X-Forwarded-For`.
- [ ] Or use PM2: `deployment/ecosystem.config.js`. Set `cwd`, `env`, and `NODE_ENV=production`.

---

## 5. Post-Deploy Checks

- [ ] **Health:** `GET /api/health` → 200.
- [ ] **Login:** `POST /api/auth/login` with `{ email, password }` → 200, `styleqr-session` cookie, `redirectTo`.
- [ ] **Dashboard:** After login, `/dashboard` loads (or “Restaurant Not Found” if no restaurant yet).
- [ ] **QR:** `GET /api/qr?token=<valid qrToken>` → 200 with `restaurantId`, `tableId`, etc.
- [ ] **Menu:** `GET /api/menu?restaurantId=<id>` → 200, array of categories with items.
- [ ] **Order:** `POST /api/orders` with valid `token` and `items` → 201, `{ success: true, orderId }`.
- [ ] **Order track:** `GET /api/orders/<orderId>` → 200 with order details.

---

## 6. CORS / LAN (Dev)

- [ ] `next.config.ts` → `allowedDevOrigins` includes your dev URLs (e.g. `http://localhost:3000`, LAN IPs). Not used in production `next start`.

---

## 7. Common Issues

| Issue | Cause | Fix |
|-------|--------|-----|
| `EADDRINUSE :::3000` | Port 3000 in use | `PORT=3001 npm run start` or stop the process on 3000. |
| `JWT_SECRET is required` | Missing or empty in `.env` | Set `JWT_SECRET` (min 32 chars). |
| `Prisma $connect warmup failed` | DB unreachable or wrong `DATABASE_URL` | Check DB, migrations, and `DATABASE_URL`. |
| `Restaurant Not Found` on dashboard | User has no restaurant | Create restaurant (signup flow or seed) and link to `ownerId`. |
| `Order not found` after place order | `POST /api/orders` failed (e.g. 400/404/500) or wrong `orderId` | Check `POST /api/orders` response and logs; ensure token and menu item IDs are valid. |
| `Blocked cross-origin request` (dev) | Request from origin not in `allowedDevOrigins` | Add that origin to `allowedDevOrigins` in `next.config.ts`. |

---

## 8. Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Run production server. |
| `npm run start:lan` | Build + start on `0.0.0.0`. |
| `npm run check-env` | Node/npm and `.env` checks. |
| `npm run seed:admin` | Create super admin (interactive). |
| `npm run deploy` | Runs `deployment/deploy.js`. |

---

## 9. Tech Stack (for reference)

- **Framework:** Next.js 16.1.1 (App Router, Turbopack in dev).
- **DB:** PostgreSQL, Prisma 6.x.
- **Auth:** JWT in `styleqr-session` cookie; `src/proxy.ts` for route protection.
- **UI:** React 19, Tailwind 4, Lucide.
