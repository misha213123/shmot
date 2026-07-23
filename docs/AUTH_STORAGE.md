# DRIPLY Auth and Storage

## Implemented

- Supabase email/password authentication client.
- Persistent browser session and automatic token refresh.
- Protected backend routes validated through Supabase Auth.
- Profile ID equals the Supabase Auth user UUID.
- Authenticated profile upsert.
- Authenticated product creation and own-products list.
- Authenticated favorites and swipe actions.
- Upload of 1-10 product images to Supabase Storage.
- 12 MB maximum per image.
- JPEG, PNG, WEBP, HEIC and HEIF validation.
- Cleanup of partially uploaded files after a failed upload.

## Vercel environment variables

Add to Production and Preview:

```text
VITE_API_URL=https://driply-api.onrender.com
VITE_SUPABASE_URL=https://lqanbttmbiwzmohpostw.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable/anon key>
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in Vercel or frontend code.

## Render environment variables

```text
DATABASE_URL=<Supabase Postgres connection string>
SUPABASE_URL=https://lqanbttmbiwzmohpostw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only secret key>
FRONTEND_URL=https://shmot-lime.vercel.app
```

## Storage setup

Run `supabase/storage.sql` once in Supabase SQL Editor. It creates the public `product-images` bucket and policies that allow authenticated users to manage only files inside their own UUID folder.

## Protected routes

```text
GET  /api/v1/me/profile
PUT  /api/v1/me/profile
GET  /api/v1/me/products
POST /api/v1/me/products
POST /api/v1/me/products/{product_id}/favorite
POST /api/v1/me/products/{product_id}/swipe
```

All protected requests require:

```text
Authorization: Bearer <Supabase access token>
```

## Next implementation step

Connect the existing visual login/profile/create screens to `frontend/src/lib/auth.ts`, `frontend/src/lib/api.ts`, and `frontend/src/lib/storage.ts`. After successful upload, convert returned URLs to the `images` array and call `api.createMyProduct()`.
