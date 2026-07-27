# DRIPLY Development Rules

## Project

Repository: `misha213123/shmot`

Main execution plan: `docs/MASTER_EXECUTION_PLAN.md`

All implementation work must follow that plan. Do not skip unfinished sprints.

## Primary goal

Build a stable, production-quality marketplace step by step. Quality and regression safety are more important than speed.

## Workflow

1. Read `docs/MASTER_EXECUTION_PLAN.md`.
2. Find the first unfinished sprint.
3. Complete only that sprint.
4. Run all available checks.
5. Update the execution plan and related documentation.
6. Commit changes on a dedicated branch.
7. Open a pull request.
8. Stop. Do not continue to the next sprint automatically.

## Frontend architecture

Prefer:

- React components
- React hooks
- explicit state and props
- reusable shared UI
- feature-based modules

Avoid:

- `MutationObserver` for product features
- `document.querySelector` DOM patching
- dynamically injected `<style>` tags
- large global `!important` overrides
- duplicate implementations of the same screen or feature

Navigation, headers, screens and layout must be controlled by React.

## CSS

- Keep one source of truth for each component.
- Do not fix layout through JavaScript.
- Remove duplicate and conflicting rules.
- Preserve mobile safe areas.
- Verify iPhone Safari and Telegram WebView behavior.

## Backend

- Keep FastAPI modular.
- Validate all external input.
- Never trust the frontend for permissions or ownership.
- Keep API contracts synchronized with frontend types and documentation.
- Use migrations for production schema changes.

## Database

- Use Alembic for production schema evolution.
- Add indexes for new query patterns.
- Protect referential integrity and ownership.
- Do not make destructive production changes without a verified migration path.

## Performance

Prefer pagination, lazy loading, request deduplication, cache invalidation and optimized images. Avoid duplicate state and repeated identical API requests.

## Git

- Never push directly to `main` for implementation work.
- Use a dedicated branch per sprint.
- Keep commits logical and reviewable.
- Do not hide failing checks.

## Deploy

After merge, verify:

- Vercel production deployment
- Render production deployment when backend changed
- backend `/health`
- frontend loading
- correct production API URL
- absence of critical runtime errors

Do not change production secrets unless explicitly required and reviewed.

## Definition of done

A task is complete only when:

- the user flow works;
- loading, empty and error states exist where needed;
- permissions are enforced;
- production build passes;
- tests or available checks pass;
- documentation is updated;
- a pull request is ready for review;
- known risks are documented.
