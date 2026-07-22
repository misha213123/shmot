# DRIPLY

DRIPLY is a swipe-first fashion marketplace for discovering clothing, sneakers and accessories from independent sellers.

## Product idea

- TikTok-style discovery feed
- Swipe left to skip
- Swipe right to save
- Product gallery and detailed product page
- Seller profiles and storefronts
- Favorites, follows and messaging
- Personalized recommendations based on onboarding and behavior
- Telegram Mini App first, regular web access supported

## Repository structure

```text
shmot/
├── frontend/                 React + TypeScript + Vite
├── backend/                  FastAPI application
├── supabase/                 PostgreSQL migrations and storage policies
├── docs/                     Product and engineering documentation
├── scripts/                  Local and deployment helpers
├── render.yaml               Render infrastructure blueprint
└── README.md
```

## Documentation

Start with:

1. `docs/00_MASTER_PLAN.md`
2. `docs/01_VISION.md`
3. `docs/04_MVP.md`
4. `docs/07_RECOMMENDATIONS.md`
5. `docs/10_ARCHITECTURE.md`
6. `docs/14_DEPLOYMENT.md`

## Planned stack

### Frontend

- React
- TypeScript
- Vite
- Telegram WebApp SDK
- Feature-based architecture

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Telegram initData validation

### Infrastructure

- GitHub — source control
- Vercel — frontend
- Render — backend
- Supabase — PostgreSQL and Storage

## Current phase

Phase 0: foundation and documentation.

The existing UI reference is treated as the visual direction, not as finished production code. Development will follow the staged roadmap in `docs/00_MASTER_PLAN.md`.
