# MAPA Security Guide

Basic security rules for the MAPA hackathon build. These rules are not meant to make MAPA unbreakable. They are meant to keep it from being **easy to abuse, leaking keys, or getting the team's accounts or quotas burned** during judging.

Read alongside the [README](../README.md) and [FRONTEND.md](FRONTEND.md).

---

## 1. What we're protecting

MAPA is a public web app. It holds no sensitive science data, since every NASA layer is public, so the risks are small but real:

| Asset | Risk if mishandled |
|---|---|
| Supabase keys and database | Someone reads, edits or deletes every mission; account emails leak |
| Tile proxy (`api/tiles.ts`) | Used as a free open proxy to fetch anything on the internet under our domain; Vercel bill / quota burned |
| User accounts (if used) | Weak passwords, account takeover, spam sign-ups |
| Mission names / notes | Script injection (XSS) shown to other crew members |
| The repo | Committed secrets, a malicious dependency |
| The live demo | Goes down mid-judging because an upstream (Trek) is slow or rate-limits us |

Analogy: the app is a **habitat airlock**. Anyone can walk up to it (it's public), so every door that leads inside (the proxy, the database, user input) needs to check who's coming through and what they're carrying.

---

## 2. Secrets and configuration

- [ ] `.env.local` holds all keys and is listed in `.gitignore`. Never commit it.
- [ ] `.env.example` lists every variable with **empty or dummy values** only.
- [ ] Anything starting with `VITE_` is **bundled into the browser and public**. Only put values there that are safe for anyone to see:
  - ✅ Supabase URL, Supabase **anon / publishable** key (safe *only* with Row Level Security on, see §4)
  - ❌ Supabase **service-role** key, NASA API keys, any password or token
- [ ] Server-only secrets (if any) are read in `api/` functions via `process.env.X` (no `VITE_` prefix) and set in **Vercel → Environment Variables**.
- [ ] No keys in screenshots, slides, Discord/Messenger messages, GitHub issues or the demo video.
- [ ] Turn on **GitHub secret scanning and push protection** for the repo (Settings → Code security).

**If a secret leaks:** rotate it immediately in the provider's dashboard, then remove it from the code. Deleting the commit is not enough, because Git history and forks keep it.

---

## 3. Tile proxy (`api/tiles.ts`)

This is MAPA's biggest new attack surface. A careless proxy (`/api/tiles?url=anything`) lets anyone use our server to fetch any URL. Follow the same approach as MapaMars's `api/horizons.ts`, which only sends **fixed, validated queries**.

### Rules

- [ ] **Fixed upstream host.** The proxy only ever calls `https://trek.nasa.gov/tiles/Mars/EQ/`. The host is a constant in code, never taken from the request.
- [ ] **Allow-listed layers.** The layer ID must be one of a known list (the same IDs as the layer registry). Anything else → `400`.
- [ ] **Validated tile coordinates.** `z`, `row`, `col` must be integers; `0 ≤ z ≤ MAX_ZOOM`; `row` and `col` within the grid for that zoom (`col < 2·2^z`, `row < 2^z`).
- [ ] **Allowed extensions only:** `jpg` or `png`.
- [ ] **GET only.** Any other method → `405`.
- [ ] **Timeout** on the upstream request (e.g. 10 s) and **one retry** at most.
- [ ] **Check the response:** status `200`, `content-type` starts with `image/`, size under a limit (e.g. 2 MB). Otherwise → `502`.
- [ ] **Don't forward** the caller's cookies, auth headers or IP to NASA. Don't forward NASA's `set-cookie` back.
- [ ] **Cache aggressively:** tiles never change, so `cache-control: public, max-age=604800, immutable`. This also means NASA sees very few requests from us.
- [ ] **Error responses** say what was wrong with the request, never stack traces or internal paths.

### Shape

```ts
// api/tiles.ts (shape)
const UPSTREAM = 'https://trek.nasa.gov/tiles/Mars/EQ'
const LAYERS = new Set(['Mars_MGS_MOLA_ClrShade_merge_global_463m', /* … from registry */])
const MAX_ZOOM = 18

export async function GET(request: Request) {
  // Expected: /api/tiles/{layer}/{z}/{row}/{col}.{ext}
  const m = new URL(request.url).pathname.match(/^\/api\/tiles\/([A-Za-z0-9_]+)\/(\d+)\/(\d+)\/(\d+)\.(jpg|png)$/)
  if (!m) return new Response('Bad tile path', { status: 400 })
  const [, layer, zs, rs, cs, ext] = m
  const z = Number(zs), row = Number(rs), col = Number(cs)
  if (!LAYERS.has(layer)) return new Response('Unknown layer', { status: 400 })
  if (z > MAX_ZOOM || row >= 2 ** z || col >= 2 * 2 ** z) return new Response('Tile out of range', { status: 400 })

  const upstream = await fetch(`${UPSTREAM}/${layer}/1.0.0/default/default028mm/${z}/${row}/${col}.${ext}`, {
    signal: AbortSignal.timeout(10_000),
  })
  const type = upstream.headers.get('content-type') ?? ''
  if (!upstream.ok || !type.startsWith('image/')) return new Response('Upstream error', { status: 502 })
  const body = await upstream.arrayBuffer()
  if (body.byteLength > 2_000_000) return new Response('Tile too large', { status: 502 })

  return new Response(body, {
    headers: { 'content-type': type, 'cache-control': 'public, max-age=604800, immutable' },
  })
}
```

### Rate limiting

Vercel caching absorbs most traffic. If abuse shows up during judging, add a simple per-IP limit (e.g. Vercel Firewall rule, or Upstash Redis rate limiter) rather than writing one from scratch.

---

## 4. Supabase (only if saved missions are in scope)

MapaMars's `supabase/schema.sql` already does most of this well. Keep it.

### Database

- [ ] **Row Level Security (RLS) is ON for every table.** A table without RLS is readable and writable by anyone holding the anon key, which is everyone.
- [ ] Every table has explicit policies for `select`, `insert`, `update`, `delete`. No `using (true)` on write policies.
- [ ] Ownership is checked with `auth.uid()`, never with a user ID sent from the browser.
- [ ] `insert` policies use `with check (owner_id = auth.uid())` so users can't create rows as someone else.
- [ ] Helper functions marked `security definer` also set `search_path = ''` (MapaMars does this) and are kept minimal.
- [ ] `is_admin` can only be changed from the Supabase dashboard, never by a client policy.
- [ ] Text columns have length limits (`check (char_length(name) <= 80)`) so nobody stores megabytes in a mission name.

### Mission codes

`ABC-123` codes have about 17.5 million combinations, which is **guessable by a script**. Treat a code as a *convenience for finding* a mission, not as a password.

- [ ] Knowing a code alone must not grant edit rights.
- [ ] If a code lets someone *join* a mission, do it through one RPC function that is rate-limited and logs joins.
- [ ] Keep sanitising codes on input (`src/lib/missionCode.ts`).

### Auth

- [ ] Email confirmation **on**.
- [ ] Minimum password length 8+ (Supabase → Authentication → Policies); keep MapaMars's `PasswordInput` component.
- [ ] Redirect URLs allow-listed: production domain + `http://localhost:5173/**` only. No wildcards on other domains.
- [ ] Rate limits on sign-up / sign-in left at Supabase defaults or tighter. Turn on CAPTCHA if spam sign-ups appear.
- [ ] Sign-out clears the session (`supabase.auth.signOut()`).

---

## 5. Frontend

### Injection (XSS)

- [ ] **Never use `dangerouslySetInnerHTML`.** React escapes text by default; keep it that way.
- [ ] User-entered text (mission names, stop names, notes) is rendered as **text only**, including inside OpenLayers overlays and tooltips. When building an overlay element, set `textContent`, never `innerHTML`.
- [ ] Links built from data only allow `https:` (and `http:` for localhost). Reject `javascript:` and `data:` URLs.
- [ ] External links: `target="_blank" rel="noopener noreferrer"`.
- [ ] No `eval`, `new Function`, or string-based `setTimeout`.

### Input validation

Validate on the client for a good experience, **and again in the database / proxy** for safety. The browser can always be bypassed.

| Input | Rule |
|---|---|
| Coordinates | Finite numbers; lat −90…90, lon −180…180 |
| Stop count | Max e.g. 25 per route |
| Names / notes | Trimmed; max 80 / 500 characters |
| Mission code | `sanitizeCode()` from MapaMars |
| Walking speed, EVA hours | Clamped to a sensible range (e.g. 0.5–5 km/h, 1–8 h) |

### Security headers (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' data: blob: https://mars.nasa.gov; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; worker-src 'self' blob:; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

Notes:
- `style-src 'unsafe-inline'` is needed because OpenLayers positions overlays with inline styles.
- `worker-src blob:` is needed if geotiff.js or the slope worker is loaded as a blob.
- Because tiles go through our proxy, `img-src` doesn't need `trek.nasa.gov` or `astro.arcgis.com`. If a layer loads directly from another host, add **that exact host**, not a wildcard.
- `img-src https://mars.nasa.gov`: the Perseverance photos in the site card load straight from NASA's raw-image host (`/api/rover-photos` only passes on links under `https://mars.nasa.gov/mars2020-raw-images/`), with no referrer.
- Self-hosting the two fonts removes the Google Fonts entries.
- **Test the CSP in `npm run preview` before deploying.** A wrong CSP shows a blank map; check the browser console for "Refused to load".

### Browser storage

- [ ] Only non-sensitive preferences in `localStorage` (layer toggles, last view). Supabase manages its own session storage.
- [ ] Wrap storage reads in `try/catch` (private mode can throw).

---

## 6. Dependencies and repo

- [ ] `package-lock.json` is committed; CI and Vercel install with `npm ci`.
- [ ] Run `npm audit` before the demo; fix **high / critical** issues in runtime dependencies.
- [ ] Turn on **Dependabot alerts** for the repo.
- [ ] Before adding a package: is it maintained, widely used, and actually needed? (See FRONTEND.md: "don't add a dependency for something one file can do.")
- [ ] **Branch protection on `main`:** PR required, at least one review, no force-push.
- [ ] `.gitignore` covers `node_modules/`, `dist/`, `.env*.local`, `.vercel/`.
- [ ] Large data files (COGs, tiles) are not committed if they contain anything other than public NASA data, and use Git LFS or object storage if they're big.

---

## 7. Privacy

- [ ] Collect the minimum: email + display name for accounts. No location tracking, no analytics that fingerprint users.
- [ ] EVA mode uses a **simulated** position; the app never asks for the device's real location (`geolocation=()` in the headers).
- [ ] Show other users' **display names only**, never emails.
- [ ] Say in the About page what's stored and how to delete an account.

---

## 8. Availability during judging

Not strictly security, but the most likely way the demo "breaks":

- [ ] Demo-site tiles pre-fetched to `public/tiles/` with an automatic fallback if the proxy fails.
- [ ] COG and geology files served from our own deployment, not hot-linked.
- [ ] Every network call has a timeout and a visible error state ("Imagery unavailable · showing cached tiles"), never an infinite spinner.
- [ ] Supabase features fail gracefully: map and route planning still work signed out.

---

## 9. Pre-demo checklist

- [ ] `git log -p | grep -iE "service_role|secret|password|api[_-]?key"` finds nothing that matters
- [ ] RLS on for every table (Supabase → Database → Tables shows no "RLS disabled" warning)
- [ ] `/api/tiles/../../etc` and `/api/tiles/UnknownLayer/0/0/0.jpg` both return `400`
- [ ] A mission name of `<img src=x onerror=alert(1)>` displays as plain text everywhere
- [ ] Security headers present (check with browser DevTools → Network → response headers)
- [ ] `npm audit` clean of high / critical runtime issues
- [ ] App works with the network tab set to "Offline" after first load (cached demo tiles)

---

## Reporting a problem

Found a security issue in MAPA? Don't open a public issue. Message the team lead directly. During the hackathon we'll fix it, rotate any affected keys, and note it in the changelog.
