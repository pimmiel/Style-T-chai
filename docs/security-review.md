# Security Review — my_style (Next.js 16 / Supabase / Stripe / Gemini)

Date: 2026-07-14. Scope: full codebase (`src/`), config, and auth. Static review only — not a pen test.

## Summary

| # | Severity | Issue | File |
|---|----------|-------|------|
| 1 | **Critical** | Auth bypass — dev credentials backdoor always enabled | `src/lib/auth.ts` |
| 2 | **High** | Service-role key used for every DB call → RLS fully bypassed | `src/lib/supabase.ts` + all API routes |
| 3 | **High** | SSRF — client-supplied `image_url` fetched server-side | `src/app/api/groups/[id]/outfits/route.ts`, `src/lib/gemini.ts` |
| 4 | **High** | No rate limiting on paid AI endpoints (cost/DoS abuse) | all `moderate`/`outfitFeedback`/`geminiEmbed` callers |
| 5 | **Medium** | PostgREST filter injection + email enumeration in user search | `src/app/api/users/search/route.ts` |
| 6 | **Medium** | No security headers / CSP; no middleware | `next.config.ts` |
| 7 | **Medium** | Unvalidated file upload (type/size/SVG) into public bucket | `src/app/api/posts/route.ts` |
| 8 | **Medium** | Flagged content still visible; moderation fails open | group outfits GET / posts flow |
| 9 | **Low** | Raw error messages returned to client | `src/app/api/posts/route.ts` |
| 10 | **Low** | Prompt injection via caption into Gemini | `src/lib/moderation.ts`, `outfitFeedback.ts` |

Good practices already in place: Stripe webhook signature is verified, the cron route is protected by a bearer secret, ownership checks exist on posts/groups mutations, `.env*` is gitignored, and no secrets are hardcoded.

---

## 1. Critical — Dev credentials backdoor (auth bypass)

`src/lib/auth.ts` registers a `CredentialsProvider` unconditionally:

```ts
async authorize(credentials) {
  if (!credentials?.email) return null;
  const devPassword = process.env.DEV_PASSWORD ?? "dev";
  if (credentials.password !== devPassword) return null;
  return { id: `dev-${credentials.email}`, email: credentials.email, ... };
}
```

Anyone who reaches the sign-in form can authenticate as **any email** using the password `dev` (the default when `DEV_PASSWORD` is unset). There is no `NODE_ENV` gate, so this ships to production. Even where it grants a `dev-*` id rather than a real user id, it is a login bypass and must not exist in prod.

**Fix:** gate the entire provider behind `process.env.NODE_ENV !== "production"`, and require a strong `DEV_PASSWORD` with no default:

```ts
...(process.env.NODE_ENV !== "production" && process.env.DEV_PASSWORD
  ? [CredentialsProvider({ /* ... */ })]
  : []),
```

## 2. High — Every query uses the service-role key (RLS bypassed)

All API routes call `supabaseAdmin()`, which uses `SUPABASE_SERVICE_ROLE_KEY`. That key bypasses Row Level Security entirely, so **application code is the only thing enforcing authorization**. One missing membership/ownership check anywhere = full data exposure, and there is no database-level safety net.

**Fix:** Enable RLS on every table and use a request-scoped anon/user client (`supabaseClient()` with the user's JWT) for user-owned reads/writes. Reserve `supabaseAdmin()` for genuinely privileged operations (webhooks, cron). Treat RLS as defense-in-depth even if you keep the current checks.

## 3. High — SSRF via client-supplied `image_url`

In `POST /api/groups/[id]/outfits`, `image_url` comes straight from the JSON body and is passed to `moderate()` / `outfitFeedback()`, which in `gemini.ts` does `await fetch(opts.imageUrl)` server-side. An authenticated member can point it at internal addresses (e.g. `http://169.254.169.254/…` cloud metadata, `http://localhost:…` internal services). It's blind SSRF but still lets an attacker probe the internal network. The stored value is also arbitrary.

**Fix:** don't accept raw URLs. Upload via the same Supabase-storage path used for `/api/posts`, or validate that `image_url` is an `https` URL on your own Supabase storage host before fetching. Block private/link-local IP ranges.

## 4. High — No rate limiting on paid AI endpoints

Post creation, group-outfit creation, and outfit feedback all call Gemini (moderation, feedback, embeddings). None are rate-limited. An authenticated user can loop these to run up API cost and degrade the service.

**Fix:** add per-user/IP rate limiting (Upstash Ratelimit, Vercel KV, or Supabase-backed counters) on all AI-invoking routes, plus a sensible per-user daily cap.

## 5. Medium — Filter injection + email enumeration in user search

```ts
.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
```

`q` is interpolated straight into a PostgREST filter string, so a crafted `q` can inject extra filter clauses (e.g. commas/`.eq.`) and change query semantics. Separately, searching by `email` and returning `email` lets any logged-in user enumerate other users' email addresses (PII).

**Fix:** sanitize/escape `q` (strip `,`, `(`, `)`, `:` or use `.ilike()` with a parameter rather than building the `.or()` string), and stop returning `email` in results — search and return name/handle only.

## 6. Medium — Missing security headers and CSP

`next.config.ts` sets no headers and there is no `middleware.ts`. Missing HSTS, `X-Content-Type-Options`, `X-Frame-Options`/frame-ancestors, `Referrer-Policy`, and a Content-Security-Policy.

**Fix:** add a `headers()` block in `next.config.ts` (or middleware) with at least:
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP scoped to your Supabase/Stripe/Gemini origins.

## 7. Medium — Unvalidated file uploads into a public bucket

`uploadImage()` in `/api/posts` derives the extension from the client filename and trusts the client `contentType`, with no size or MIME allow-list. `post-images` is public. A user can upload an SVG (stored-XSS if served inline) or very large files.

**Fix:** allow-list image MIME types server-side, cap file size, sanitize/normalize extensions, and set `Content-Disposition`/content-type on the bucket so SVGs aren't served as active content (or disallow SVG).

## 8. Medium — Flagged content shown; moderation fails open

On moderation error the item is marked `flagged` but still inserted. `GET /api/groups/[id]/outfits` returns outfits without filtering `moderation_status`, so `flagged` (and failed-check) content is shown to the group. `/api/posts` explore correctly filters `approved`, but the "community" view and group outfits do not.

**Fix:** decide the fail-open vs fail-closed policy explicitly, and filter out `rejected`/`flagged` from display queries (or hide until a human review clears them).

## 9. Low — Raw error messages leaked to client

The `catch` in `POST /api/posts` returns `msg` (the raw error) in the 500 body. This can leak internal details (DB/storage errors).

**Fix:** return a generic message; log the detail server-side only.

## 10. Low — Prompt injection via caption

Captions are interpolated into Gemini prompts in `moderation.ts` / `outfitFeedback.ts`. A crafted caption could try to steer the model (e.g. force an "approved" verdict or manipulate feedback text). Impact is limited but real for the moderation gate.

**Fix:** keep user content clearly delimited from instructions, and don't rely solely on the model's verdict — combine with deterministic checks where it matters.

---

## Suggested priority

1. Remove/gate the dev credentials provider (#1) — do this first.
2. Fix the SSRF and add rate limiting (#3, #4).
3. Turn on RLS as defense-in-depth (#2).
4. Then work through the mediums (#5–#8) and lows.
