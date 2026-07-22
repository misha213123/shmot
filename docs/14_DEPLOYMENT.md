# Deployment

## Services
- GitHub: source repository
- Vercel: frontend
- Render: FastAPI backend
- Supabase: PostgreSQL and Storage

## Supabase setup
1. Create a project.
2. Copy the pooled PostgreSQL connection string.
3. Create storage buckets: `product-images`, later `chat-media`.
4. Run migrations from `supabase/migrations` or Alembic.
5. Store service-role key only in Render.

## Render setup
1. Create a Blueprint from the repository or a Web Service from `backend`.
2. Build: `pip install -r requirements.txt`.
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Set environment variables from `backend/.env.example`.
5. Set health check to `/health`.

## Vercel setup
1. Import the GitHub repository.
2. Root directory: `frontend`.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Set `VITE_API_URL` to the Render backend URL.

## Telegram setup
1. Create or select bot in BotFather.
2. Configure menu button/Web App URL to the Vercel domain.
3. Add the bot token to Render.
4. Configure deep links for product, seller and referral contexts.

## Production checks
- HTTPS only
- exact CORS origins
- no service-role secret in frontend
- health endpoint works
- database migrations applied
- storage upload limits enabled
- Telegram initData validation enabled
- Sentry/logging configured
- backups verified
