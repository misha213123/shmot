# DRIPLY — Master Execution Plan

This is the canonical implementation plan for DRIPLY. Codex must execute it one sprint at a time.

## Working rule

1. Read `AGENTS.md`, `docs/CODEX_WORKFLOW.md` and this file.
2. Select only the first unfinished sprint.
3. Work in a dedicated branch.
4. Run the required checks.
5. Update this plan and the sprint log.
6. Open a pull request and stop.

Do not continue to another sprint in the same task.

---

## Sprint 1 — Frontend architecture stabilization

Goal: remove the DOM/runtime patches responsible for navigation, header, scrolling and duplicate UI regressions.

- [ ] Create `docs/RUNTIME_MIGRATION_MAP.md` listing every frontend runtime module, its responsibility and React replacement.
- [ ] Extract `BottomNavigation` into a React component.
- [ ] Extract `AppHeader` into a React component.
- [ ] Extract `SearchScreen`, `FavoritesScreen` and `ProfileScreen` from `MarketplaceApp.tsx`.
- [ ] Remove only the runtime navigation/header patches that have working React replacements.
- [ ] Consolidate conflicting `.topbar`, `.bottom-nav`, `.app-shell` and `.screen-transition` styles.
- [ ] Preserve feed behavior and admin access.
- [ ] Verify scrolling and bottom navigation taps on mobile.
- [ ] Run `npm install` and `npm run build` in `frontend/`.

Acceptance:

- Search, Favorites and Profile headers are identical and centered.
- Bottom navigation stays at the bottom, is clickable and never duplicates.
- Non-feed screens scroll vertically.
- Feed behavior is unchanged.
- Frontend production build passes.

---

## Sprint 2 — Complete React screen decomposition

- [ ] Extract Feed, Product, Seller, Create/Edit Listing, Messages, Deals and Notifications screens.
- [ ] Reduce `MarketplaceApp.tsx` to navigation and top-level orchestration.
- [ ] Remove replaced `MutationObserver`, `querySelector` and injected-style implementations.
- [ ] Create shared ProductGrid, ProductCard, EmptyState, ErrorState and Skeleton components.
- [ ] Add clear loading, empty and error states.

---

## Sprint 3 — Data layer and cache

- [ ] Create one server-data layer/hooks for feed, favorites and own products.
- [ ] Add request cancellation and request deduplication.
- [ ] Version cache entries and scope them by user id.
- [ ] Add TTL and logout invalidation.
- [ ] Restore the last screen and relevant scroll position.
- [ ] Ensure stale data is shown instantly and refreshed in the background.

---

## Sprint 4 — Telegram Mini App authentication

- [ ] Validate Telegram `initData` on the backend.
- [ ] Check hash and `auth_date` lifetime.
- [ ] Upsert a profile from Telegram user data.
- [ ] Keep Supabase Auth as browser fallback.
- [ ] Add Telegram BackButton, theme, viewport and haptic integration.
- [ ] Add tests for valid and forged Telegram data.

---

## Sprint 5 — Onboarding and profile editing

- [ ] Add onboarding for city, categories, sizes, brands and price range.
- [ ] Add editable avatar, name, username, city, contact and bio.
- [ ] Add preference and notification settings.
- [ ] Persist completion state and preferences.
- [ ] Use onboarding data for recommendation cold start.

---

## Sprint 6 — Listing lifecycle and moderation

Target lifecycle:

`draft → pending → active → reserved → sold → archived`, with `rejected` where necessary.

- [ ] Add `pending` and `rejected` statuses through migrations.
- [ ] Add rejection reason and moderation metadata.
- [ ] Send new listings to moderation.
- [ ] Add admin moderation queue and audit history.
- [ ] Add listing preview, draft autosave, image ordering and cover selection.
- [ ] Delete orphaned Storage files after failures or listing deletion.

---

## Sprint 7 — Search, filters and pagination

- [ ] Keep one React search implementation.
- [ ] Add filters for location, category, brand, size, condition, color, price and delivery.
- [ ] Add sorting, reset and result count.
- [ ] Add cursor pagination to feed, search, favorites and seller listings.
- [ ] Add infinite loading and stable cursor ordering.
- [ ] Add database indexes for common query patterns.

---

## Sprint 8 — Recommendations

- [ ] Track impressions, view duration, image navigation, product opens, swipes, favorites, chats, offers and completed deals.
- [ ] Implement documented scoring for category, brand, size, price, city, freshness and popularity.
- [ ] Add seen/skip penalties, seller diversity and exploration.
- [ ] Explain recommendation reasons where useful.
- [ ] Prepare later collaborative-filtering and embedding work without blocking MVP.

---

## Sprint 9 — Chats and notifications

- [ ] Build real Conversations and Chat React screens.
- [ ] Add read/unread state and unread counters.
- [ ] Add message pagination and realtime delivery.
- [ ] Remove N+1 chat-list database queries.
- [ ] Add blocking/reporting from chat.
- [ ] Add in-app and Telegram notifications for messages, offers, moderation and deals.

---

## Sprint 10 — Deals and reviews

Deal states:

`offered → accepted → reserved → completed`, with `rejected`, `cancelled` and `expired`.

- [ ] Store status history, actor and offer amount.
- [ ] Reserve and release products consistently.
- [ ] Prevent conflicting active deals.
- [ ] Build buyer/seller deal lists and a clear deal detail screen.
- [ ] Permit reviews only after completed deals.
- [ ] Recalculate seller rating safely.

---

## Sprint 11 — Security and database hardening

- [ ] Add rate limits for auth, uploads, messages, search, reports, offers and swipes.
- [ ] Validate JWT locally through JWKS instead of calling Supabase user endpoint for every request.
- [ ] Verify ownership and role checks across protected endpoints.
- [ ] Audit Supabase RLS and Storage policies.
- [ ] Make Alembic migrations the production schema source of truth.
- [ ] Add file-size, MIME/signature and image-dimension validation.

---

## Sprint 12 — Tests and CI/CD

Frontend:

- [ ] ESLint and formatting.
- [ ] Vitest and React Testing Library.
- [ ] Playwright critical-flow tests.

Backend:

- [ ] pytest and async API tests.
- [ ] authorization, ownership, lifecycle, chat, deal and moderation tests.

CI:

- [ ] lint, typecheck, tests and builds on pull requests.
- [ ] block merge when required checks fail.
- [ ] deploy production only from `main`.

---

## Sprint 13 — Observability and performance

- [ ] Add frontend/backend error monitoring.
- [ ] Track API latency, error rate, DB query time, cold starts and feed-ready time.
- [ ] Add image thumbnails, WebP/AVIF, lazy loading and next-card preload.
- [ ] Analyze bundle size and code-split large screens.
- [ ] Profile and optimize slow SQL queries.

---

## Sprint 14 — Documentation and closed beta

- [ ] Keep README and docs aligned with the actual implementation.
- [ ] Document environment variables, local setup, migrations, Supabase, Vercel, Render and BotFather.
- [ ] Choose one launch city and focused niche.
- [ ] Recruit 20–30 sellers and seed 300–500 real listings.
- [ ] Run a closed beta with about 100 buyers.
- [ ] Measure retention, saves, chats, deals and sold listings.

---

## Definition of done

A task is complete only when:

- the user flow works;
- backend validation and permissions are correct;
- loading, empty and error states exist;
- mobile Safari and Telegram WebView are considered;
- available builds/tests pass;
- documentation is updated;
- known risks are reported;
- a reviewable pull request is ready.

## Sprint log

### Sprint 1

- Status: `NOT STARTED`
- Branch:
- Commit:
- Pull request:
- Checks:
- Known risks:

### Sprint 2

- Status: `NOT STARTED`
- Branch:
- Commit:
- Pull request:
- Checks:
- Known risks:
