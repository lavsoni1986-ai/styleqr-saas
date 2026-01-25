# StyleQR on LAN (192.168.31.135:3000)

Run the app in production mode on a LAN IP. Cookies work over HTTP; no redirect loop.

## 1. Set `NEXT_PUBLIC_APP_URL`

In `.env` (create from `deployment/env.lan.template`):

```env
NEXT_PUBLIC_APP_URL=http://192.168.31.135:3000
```

Use the exact URL you type in the browser (host + port). If the machine’s IP or port changes, update this.

## 2. Cookie and HTTPS

- Cookie `secure` is **true only when HTTPS** (via `x-forwarded-proto` or `request.url`).
- On `http://192.168.31.135:3000`, `secure` is false → cookie is stored and sent.
- Cookie always uses `path="/"` and `sameSite="lax"`.

## 3. Build and start

```bash
npm run build && npm run start
```

To listen on all interfaces (so other devices on LAN can reach it):

```bash
npm run build && npx next start -H 0.0.0.0
```

Or:

```bash
npm run start:lan
```

## 4. How to access

- Open **only** `http://192.168.31.135:3000` in the browser.
- Do **not** use `http://localhost:3000`; the cookie is tied to the `Host` the server sees.

## 5. Verify

1. **POST /api/auth/login** with `{ "email": "...", "password": "..." }`  
   - Expect **200** and JSON with `success`, `user`, `redirectTo`.

2. **Cookie**  
   - Response `Set-Cookie` includes `styleqr-session` with `Path=/`, `SameSite=Lax`, and **no** `Secure` on HTTP.

3. **Dashboard**  
   - After login, `window.location.replace("/dashboard")` and the next request includes `Cookie: styleqr-session=...`  
   - Middleware allows it → `/dashboard` loads without redirect to `/login`.

## Quick setup

```bash
# 1. Copy env template and set JWT_SECRET + DATABASE_URL
cp deployment/env.lan.template .env
# Edit .env: set JWT_SECRET (e.g. from: openssl rand -base64 32)

# 2. DB (if needed)
npx prisma generate
npx prisma db push

# 3. Build and start
npm run build && npm run start

# 4. Open in browser
# http://192.168.31.135:3000
```
