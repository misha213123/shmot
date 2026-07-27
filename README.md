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
├── docs/                     Product, engineering and Codex documentation
├── render.yaml               Render infrastructure blueprint
├── AGENTS.md                 Root discovery instructions for Codex
└── README.md
```

## Documentation

Start with:

1. `docs/README.md`
2. `docs/MASTER_EXECUTION_PLAN.md`
3. `docs/CODEX_WORKFLOW.md`
4. `docs/01_VISION.md`
5. `docs/04_MVP.md`
6. `docs/07_RECOMMENDATIONS.md`
7. `docs/10_ARCHITECTURE.md`
8. `docs/14_DEPLOYMENT.md`

`MASTER_EXECUTION_PLAN.md` is the only canonical roadmap and sprint checklist. Do not create competing master plans or ad-hoc TODO files.

## Stack

### Frontend

- React
- TypeScript
- Vite
- Telegram WebApp SDK
- Feature-based architecture target

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- Supabase Auth and Storage
- Telegram `initData` validation planned in the execution plan

### Infrastructure

- GitHub — source control
- Vercel — frontend
- Render — backend
- Supabase — PostgreSQL and Storage

## Current phase

The project already contains a working marketplace foundation. Current work is focused on architecture stabilization and removal of conflicting runtime DOM patches before new product features are expanded.

Development proceeds one sprint at a time according to `docs/MASTER_EXECUTION_PLAN.md`.
