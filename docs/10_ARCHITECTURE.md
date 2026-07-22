# Architecture

## Monorepo

```text
frontend/
  src/
    app/
    components/
    features/
      auth/
      onboarding/
      feed/
      products/
      favorites/
      sellers/
      messages/
      profile/
      admin/
    services/
    hooks/
    stores/
    styles/
    types/

backend/
  app/
    api/v1/
    core/
    db/
    models/
    schemas/
    repositories/
    services/
    integrations/
    jobs/
    tests/
  alembic/

supabase/
  migrations/
  policies/
  seed/

docs/
```

## Frontend boundaries
- Features own screens, hooks and local components.
- Shared UI components contain no marketplace business rules.
- API calls go through a typed client.
- Telegram SDK access is wrapped in one service.
- Feed gesture state is separate from server state.

## Backend layers
- API: request/response and authorization.
- Services: business logic and transactions.
- Repositories: database queries.
- Models: persistence.
- Schemas: input/output contracts.
- Integrations: Telegram and Supabase.

## Key rules
- The frontend never receives Supabase service-role keys.
- Product ownership is checked on the backend.
- Feed ranking is a backend service.
- Image paths are scoped to the authenticated seller.
- Every admin mutation creates an audit record.
- Cursor pagination is used for feed and messages.
