# DRIPLY Runtime Migration Map

Updated: 2026-08-05

This document is the source of truth for removing frontend DOM patches. A runtime may be deleted only after its user flow has an explicit React owner and mobile behavior has been verified.

## Rules

- Navigation, headers, screens and modal visibility belong to React state.
- Business actions must use typed callbacks, not button text, synthetic clicks or `querySelector`.
- CSS belongs in imported stylesheets, not injected `<style>` elements.
- `MutationObserver` is allowed only for third-party DOM that React does not own.
- `window.fetch` must not be patched by feature modules.

## Current modules

| Runtime | Current responsibility | Risk | React replacement | Sprint/status |
|---|---|---|---|---|
| `instantMarketplaceCache.ts` | Returns cached marketplace GET responses and refreshes in background | Global `window.fetch` patch; stale cross-feature behavior | Central query client/store with user-scoped cache | Sprint 3 — keep temporarily |
| `adminNavigationRuntime.ts` | Previously injected admin navigation after permission lookup | Navigation appeared late; DOM injection | Admin capability is now resolved inside React `BottomNavigation` | Sprint 1 — **removed from bootstrap** |
| `realtimeExperienceRuntime.ts` | Realtime messages, presence, typing, manual chat DOM updates | Patches fetch and mutates chat DOM | React chat provider/hooks and components | Sprint 9 — pending |
| `chatRuntime.ts` | Builds conversation list/chat overlays and sends messages | Entire screen outside React; synthetic routing | `MessagesScreen`, `ConversationScreen`, chat hooks | Sprint 2/9 — pending |
| `notificationRuntime.ts` | Injects notification center and unread badge | Competes with headers/navigation | React notification provider and screen | Sprint 2/9 — pending |
| `appWarmupRuntime.ts` | Warms backend and prefetches core endpoints | Duplicate requests and hidden lifecycle | App bootstrap/query prefetch | Sprint 3 — pending |
| `mobileInteractionRuntime.ts` | Swipe gesture plus former global single-tap/close/nav interception and injected feed CSS | Double activations and ghost clicks | React click handlers + CSS; gesture hook only | Sprint 1 — **navigation/header interception removed; gesture kept temporarily** |
| `iosSwipeRuntime.ts` | iOS-specific swipe fallback | Duplicate gesture ownership | Shared pointer/touch gesture hook | Sprint 2 — pending |
| `feedChromeRuntime.ts` | Previously injected feed header controls and notification sheet | Duplicate header and notification UI | `AppHeader` + React notification screen | Sprint 1 — **disabled from bootstrap** |
| `removeFeedLoadingText.ts` | Hides loading copy after render | Masks loading-state defects | React skeleton/empty/error state | Sprint 2 — pending |
| `emptyFeedRuntime.ts` | Replaces empty feed DOM | Competes with React empty state | `FeedScreen` empty state | Sprint 2 — pending |
| `productEditDomSync.ts` | Synchronizes edit controls through DOM | Fragile selectors | Product edit React state | Sprint 2/6 — pending |
| `chatProductContextRuntime.ts` | Infers active product for chat | Patches fetch/DOM context | Explicit `productId` navigation parameter | Sprint 2/9 — pending |
| `notificationChatBridge.ts` | Converts notification clicks into chat actions | Synthetic cross-runtime events | Typed notification destinations/router | Sprint 2/9 — pending |
| `sellerProfileRuntime.ts` | Rewrites seller buttons and triggers hidden chat click | Synthetic click and duplicated UI | `SellerScreen` callbacks | Sprint 2 — pending |
| `reservationDomSync.ts` | Injects reservation controls | DOM/business logic coupling | Deal/reservation React components | Sprint 2/10 — pending |
| `reportRuntime.ts` | Injects reporting UI | DOM overlay ownership | React report modal | Sprint 2/6 — pending |
| `socialRuntime.ts` | Follow/share seller actions | DOM mutation | Seller React actions/hooks | Sprint 2 — pending |
| `dealRuntime.ts` | Deal center and offer overlays | Duplicate buttons and global overlays | Deals React screens/provider | Sprint 2/10 — pending |
| `reviewRuntime.ts` | Review UI | Injected overlay | Review React form/list | Sprint 2/10 — pending |
| `recommendationRuntime.ts` | Recommendation collections and overlays | Cascading overlay/click bugs | Recommendation React screen/sheet | Sprint 2/8 — pending |

## React ownership already present

- `frontend/src/shared/navigation/BottomNavigation.tsx` owns the five primary tabs and conditional admin entry.
- `frontend/src/shared/navigation/AppHeader.tsx` owns title, back, notification, filter and profile-settings controls.
- `frontend/src/features/search/SearchScreen.tsx` owns Search layout.
- `frontend/src/features/favorites/FavoritesScreen.tsx` owns Favorites layout.
- `frontend/src/features/profile/ProfileScreen.tsx` owns Profile layout.
- `MarketplaceApp.tsx` currently owns top-level screen selection; it must become a thin orchestrator during Sprint 2.

## Sprint 1 removals

1. Removed the global replacement of `window.MutationObserver` from `main.tsx`.
2. Removed the global deal-button DOM guard from `main.tsx`.
3. Disabled `feedChromeRuntime` because `AppHeader` already renders the header controls.
4. Removed bottom-navigation interception, synthetic single-tap activation, header visibility mutation and injected feed styles from `mobileInteractionRuntime`.
5. Moved admin access and the admin navigation button into `BottomNavigation`; removed `adminNavigationRuntime` from bootstrap.
6. Consolidated non-feed header rules into `react-shell.css` and deleted the superseded override stylesheet.
7. Updated fullscreen feed CSS so React header buttons remain visible and clickable.
8. Kept only the existing swipe gesture in `mobileInteractionRuntime` until Feed extraction supplies a React hook.

## Verification checklist

- Bottom navigation reacts to one normal click/pointer activation.
- Search, Favorites and Profile use the same centered React header.
- Feed retains its fullscreen layout from imported CSS.
- React notification/filter header controls remain visible on the feed.
- No duplicate notification/header controls are injected.
- Non-feed screens remain vertically scrollable.
- Cached admin access renders immediately and is refreshed in the background.
- Production TypeScript/Vite build passes.
