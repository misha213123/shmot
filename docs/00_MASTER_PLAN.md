# DRIPLY Master Plan

## Phase 0 — Foundation
- GitHub repository
- frontend/backend/supabase/docs structure
- environment templates
- local run commands
- Vercel and Render configs

## Phase 1 — Core data
- Supabase project
- PostgreSQL connection
- SQLAlchemy models
- Alembic migrations
- users, products, images, swipes, favorites, follows, conversations, messages, reports

## Phase 2 — Authentication
- Telegram initData validation
- user upsert by telegram_id
- development login outside production
- roles and blocked-user rules

## Phase 3 — Profiles and onboarding
- city, sizes, categories, brands, price range
- buyer profile
- public seller profile
- seller storefront

## Phase 4 — Listings
- draft creation
- multi-image upload to Supabase Storage
- preview and validation
- moderation lifecycle: draft → pending → active → reserved → sold/archive

## Phase 5 — Feed
- cursor pagination
- exclusions for own, blocked, unavailable and already-seen products
- swipe gestures
- favorites
- filters and undo

## Phase 6 — Recommendations
- onboarding-based cold start
- behavioral scoring
- popularity, freshness and exploration
- feed diversification
- later: collaborative filtering and embeddings

## Phase 7 — Communication
- conversations linked to products
- messages and unread state
- realtime delivery
- Telegram notifications
- block and report flows

## Phase 8 — Admin and safety
- moderation queue
- complaints
- user/product blocking
- audit log
- rate limiting and upload security

## Phase 9 — Deployment
- Vercel frontend
- Render backend
- Supabase PostgreSQL and Storage
- BotFather Web App configuration
- production CORS and secrets

## Phase 10 — Marketplace launch
- one city and one focused niche
- 20–30 founding sellers
- 300–500 active listings
- closed beta with 100 buyers
- measure saves, messages, retention and sold listings

## Phase 11 — Monetization
- promoted listings
- seller subscription
- analytics tools
- only later: payments, shipping, refunds and buyer protection

## MVP completion criteria
- Telegram login works
- seller publishes real listing with images
- admin approves listing
- buyer receives personalized feed
- swipes and favorites persist
- buyer can message seller
- seller can reserve and mark sold
- reports and blocks work
- production deployment is stable
