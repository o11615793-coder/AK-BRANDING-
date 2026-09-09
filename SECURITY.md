# SECURITY.md — AK Branding

This document explains how security is implemented across the site and what you need to configure before going to production. No system connected to the internet is ever "100% unhackable" — this document describes industry-standard practices used here to minimize attack surface, not a guarantee.

---

## 1. Security Architecture

- **Frontend**: React/Vite static site. Contains only the Supabase **anon/public** key — never a secret.
- **Backend**: Supabase (Postgres + Auth + Storage). All authorization is enforced **server-side** via Postgres Row Level Security (RLS) policies, not by hiding UI elements.
- **Principle followed throughout**: the client is never trusted. Every sensitive read/write is re-checked by the database itself against the logged-in user's identity (`auth.uid()`).

```
Browser (anon key only)
   │
   ▼
Supabase Auth  ──►  Postgres (RLS enforced on every table)
   │
   ▼
Supabase Storage (bucket policies enforced per-file)
```

## 2. Admin Authentication

- Uses **Supabase Authentication** (email + password) — passwords are hashed and managed entirely by Supabase, never touched or stored by this app's code.
- **There is no public admin registration route.** The `admins` table has no INSERT/UPDATE/DELETE policy for any client role at all — the only way to grant admin access is manually, via the Supabase Dashboard or SQL Editor, by someone with direct project access.
- To create your admin account:
  1. Supabase Dashboard → **Authentication → Users → Add user** (set an email + strong password).
  2. Copy the generated user UUID.
  3. SQL Editor:
     ```sql
     insert into public.admins (user_id) values ('paste-uuid-here');
     ```
- Login includes a client-side progressive lockout after 5 failed attempts (UX-level nicety). The real brute-force protection is Supabase Auth's built-in server-side rate limiting on the token endpoint — see section 6 for how to tighten this further.

## 3. Authorization

- Every admin-only action (add/edit/delete product, upload/delete image, read enquiries) is gated by a Postgres function `public.is_admin()`, which checks whether `auth.uid()` exists in the `admins` table.
- This function is called from **every** admin RLS policy — insert, update, delete on `products`; select on `enquiries`; insert/update/delete on the `product-images` storage bucket.
- Because this check happens in the database, it holds even if someone bypassed the React app entirely and called the Supabase API directly.

## 4. Supabase Row Level Security (RLS) Policies

All tables have RLS **enabled**, with explicit, narrow policies (see `supabase/migrations/001_init.sql` for the full SQL):

| Table | Public (anon) | Authenticated non-admin | Admin |
|---|---|---|---|
| `products` | Read only `status = 'published'` rows | Read only published rows | Full read/write/delete |
| `enquiries` | Insert only (submit form) | Insert only | Read (no update/delete via API) |
| `admins` | No access | Read own row only | Read own row only (no self-promotion) |
| `audit_log` | No access | No access | Read + insert (append-only) |

No policy anywhere uses `USING (true)` for a write operation.

## 5. Image Upload Security

- Uploads restricted to a dedicated `product-images` Storage bucket.
- **Client-side validation**: MIME type, file extension, and 5MB size limit checked before upload (`src/pages/admin/AddEditProduct.jsx`).
- **Server-side enforcement**: the bucket itself is configured with `file_size_limit` and `allowed_mime_types` (JPEG/PNG/WEBP only) in the migration — this cannot be bypassed by a modified client.
- **Filenames are never trusted.** Every upload is renamed to a randomly generated UUID-based filename before storage, which prevents path traversal and filename collisions.
- Only admins (per the storage bucket RLS policies) can insert, update, or delete files. Public users can only **read** (needed to display product photos).
- SVG uploads are not in the allowed MIME list, avoiding the XSS risk of unsanitized SVG.

## 6. Rate Limiting & Bot Protection

- **Login**: client-side progressive backoff (doubling delay after 5 failed attempts) plus Supabase Auth's built-in server-side throttling.
- **Recommended hardening** (configure in Supabase Dashboard → Authentication → Rate Limits, and Authentication → Attack Protection): enable **CAPTCHA (Cloudflare Turnstile)** for sign-in, and tune the email/password rate limits to your traffic.
- **Contact form**: includes a hidden honeypot field (`website`) that silently discards bot submissions that fill it in. For higher-traffic production use, add Turnstile to this form the same way as login (Supabase docs: Auth → Bot and Abuse Protection).
- **Database-level**: the `enquiries` table only allows INSERT for public users — no read/update/delete — limiting what a spammy or malicious submission could ever do.

## 7. Environment Variables

- `.env.example` lists every variable needed — copy it to `.env` and fill in your values.
- `.env` is listed in `.gitignore` and must **never** be committed.
- Only the **anon/public** Supabase key is ever used in this frontend. It is safe to expose in the browser bundle *because* RLS restricts what it can actually do.
- The **service-role key** is never used anywhere in this codebase. If you build a server-side function later (e.g. a Supabase Edge Function) that needs elevated privileges, store the service-role key as a Supabase **project secret**, not as a `VITE_`-prefixed variable (anything prefixed `VITE_` is bundled into the public JS and downloaded by every visitor).

## 8. Deployment Security

- Deploy the built `dist/` folder to a static host (Vercel, Netlify, Cloudflare Pages) — all of these provide HTTPS automatically via Let's Encrypt.
- Set environment variables in your hosting provider's dashboard (not in a committed file).
- Recommended production **security headers** (configure via your host's `_headers`/`vercel.json`/equivalent):
  - `Content-Security-Policy` — restrict script/style/img sources to your domain, Supabase, and Google Fonts.
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`) — prevents the admin panel from being embedded in a malicious iframe (clickjacking).
- Confirm HTTPS is working correctly before relying on HSTS (`Strict-Transport-Security`), since HSTS can lock out HTTP fallback.

## 9. Backup Strategy

- Supabase automatically takes daily backups on paid plans; on the Free tier, backups are more limited — check your current plan's retention window in **Dashboard → Database → Backups**.
- Recommended: enable **Point-in-Time Recovery** (paid add-on) once the site has real customer/product data you can't afford to lose.
- To restore: Supabase Dashboard → Database → Backups → select a backup → Restore (follow the on-screen confirmation flow). Do this only from the Dashboard with proper project access — never expose a backup file publicly.
- Product images in Storage are not covered by database backups — consider periodically exporting the `product-images` bucket if it becomes business-critical.

## 10. How to Rotate Compromised Credentials

If a secret is ever accidentally exposed (e.g. committed to Git, pasted somewhere public):

- **Supabase anon key**: Dashboard → Project Settings → API → this key is public by design and does not need rotation on its own, but if you suspect RLS was misconfigured while it was exposed, review your policies immediately.
- **Supabase service-role key** (should never be in this repo, but if it ever leaks): Dashboard → Project Settings → API → **Reset** the service-role key immediately. Update it wherever it's used server-side (e.g. Edge Function secrets).
- **Admin password**: Dashboard → Authentication → Users → select the user → **Send password reset**, or set a new password directly.
- **Database password** (if you use direct Postgres connections): Dashboard → Project Settings → Database → Reset database password.
- After rotating, audit `public.audit_log` and Supabase's own Auth logs for suspicious activity during the exposure window.

## 11. Production Security Checklist

- [ ] Admin authentication working (Supabase Auth, no plain-text passwords)
- [ ] Admin authorization enforced server-side (`is_admin()` used in every admin policy)
- [ ] RLS enabled and policies applied on `products`, `enquiries`, `admins`, `audit_log`
- [ ] Confirm a non-admin/anonymous request cannot modify or delete a product (test via Supabase API directly, not just the UI)
- [ ] Confirm a non-admin cannot upload/delete files in `product-images`
- [ ] Login lockout/backoff behaves as expected after repeated failures
- [ ] Supabase Auth rate limits reviewed/tuned; Turnstile enabled if traffic warrants it
- [ ] All form inputs have client-side **and** server-side validation (DB `check` constraints)
- [ ] No `dangerouslySetInnerHTML` or raw HTML rendering of user input anywhere in the app
- [ ] SQL injection: not applicable in the traditional sense (Supabase client uses parameterized queries), but RLS is the real backstop
- [ ] File upload validated by type, extension, and size — both client and bucket-level
- [ ] Security headers configured on the hosting provider
- [ ] HTTPS confirmed working before enabling HSTS
- [ ] `.env` confirmed **not** committed to Git; `.env.example` has placeholders only
- [ ] Session handling and logout tested (`supabase.auth.signOut()`)
- [ ] Errors shown to users are generic; technical details are not exposed
- [ ] `audit_log` capturing key admin actions, with no secrets logged
- [ ] Backup/restore process understood and documented for your Supabase plan

---

If you ever find a secret accidentally committed to your GitHub repository, **rotate it immediately** using section 10 above, then remove it from Git history (e.g. with `git filter-repo` or by rotating and treating the exposed value as permanently compromised rather than trying to fully scrub history).
