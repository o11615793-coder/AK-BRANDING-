# AK Branding — Wholesale Men's Fashion Website

Premium black-and-gold wholesale website for **AK Branding** (shop: **Alfa Traders**), built with React + Vite + Tailwind CSS and Supabase (Auth, Database, Storage).

Also read **SECURITY.md** before deploying — it walks through Supabase setup, RLS, and the full security checklist.

---

## 1. What's included

- Public site: Home, Collections (filter + search), Product Details, Wholesale, About, Contact (enquiry form)
- Admin Panel (`/admin`): secure login, dashboard, product CRUD, image upload, enquiries inbox
- WhatsApp deep-links throughout (product enquiry, wholesale enquiry, floating button)
- Supabase-backed product database — no hard-coded products
- Row Level Security on every table so the database itself enforces who can read/write what
- SEO metadata (title, description, keywords, Open Graph) per page

## 2. Run it locally

Requires Node.js 18+.

```bash
npm install
cp .env.example .env
# edit .env with your Supabase URL + anon key (see SECURITY.md, section 2)
npm run dev
```

Open http://localhost:5173

## 3. Configure Supabase (summary — full detail in SECURITY.md)

1. Create a free project at https://supabase.com
2. In **SQL Editor**, run `supabase/migrations/001_init.sql` — this creates all tables, RLS policies, and the `product-images` storage bucket.
3. In **Project Settings → API**, copy your **Project URL** and **anon public key** into `.env`.
4. In **Authentication → Users**, click **Add user** to create your own admin login (email + password).
5. Copy that user's UUID and run in SQL Editor:
   ```sql
   insert into public.admins (user_id) values ('paste-the-uuid-here');
   ```
6. Log in at `/admin/login` with that email/password.

There is **no public admin sign-up** anywhere in the app — admin accounts can only be created this way, directly in Supabase.

## 4. Adding products (no code required)

1. Go to `/admin` → **Add Product**
2. Fill in name, code, category, price, fabric, sizes, colors, MOQ, stock, description
3. Upload up to 6 product photos (JPEG/PNG/WEBP, 5MB max each)
4. Toggle **Featured** / **New Arrival** if relevant
5. Click **Publish** — the product appears on `/collections` and the homepage immediately

To change a price later: **Admin → Products → Edit** on that product, update the price, **Save Changes**. The public site reflects it instantly — no code or redeploy needed.

## 5. Where to change WhatsApp number / business details

- WhatsApp number, business name, shop name, Instagram handle: edit the values in your `.env` file (`VITE_WHATSAPP_NUMBER`, etc.) — no code changes needed.
- Address and other static text on the About/Contact pages: edit `src/pages/About.jsx` and `src/pages/Contact.jsx` directly.
- Logo/banner images: replace `public/logo.png` and `public/banner.png` with your final exported brand assets (the ones currently in the project are cropped from the screenshots you shared — swap in clean exports from Instagram/your designer for best quality).

## 6. Deploying

Any static host that supports a Vite build works (Vercel, Netlify, Cloudflare Pages):

```bash
npm run build
```

This outputs a static `dist/` folder. Set the same environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.) in your hosting provider's dashboard — **do not** commit your real `.env` file (it's already git-ignored).

Point your domain's DNS at the host, and enable HTTPS (most hosts, including Vercel/Netlify, do this automatically via Let's Encrypt).

## 7. Project structure

```
src/
  components/     Header, Footer, ProductCard, WhatsApp button, route guard
  context/        AuthContext (Supabase session + admin role)
  hooks/          useProducts (public product queries)
  lib/            supabaseClient.js, whatsapp.js
  pages/          public pages
  pages/admin/    admin dashboard, product CRUD, enquiries
supabase/
  migrations/001_init.sql   full schema + RLS + storage policies
```

## 8. Not built yet (intentionally, per "future ready" scope)

Structured to add later without a rewrite: shopping cart, payment gateway, customer accounts, order tracking, GST invoicing, and richer enquiry management (status/notes on each enquiry). The `products` and `enquiries` tables and the admin auth pattern are the foundation for all of these.
