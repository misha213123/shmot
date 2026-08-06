# Sprint 1 mobile verification checklist

Use the Vercel preview for Pull Request #2 on a real iPhone and, when available, Android Chrome.

## Required checks

1. Open the feed and confirm the DRIPLY header is visible immediately.
2. Tap the notification button once; it must react to one tap and must not open from bottom navigation taps.
3. Tap every bottom navigation item once: Feed, Search, Add, Favorites, Profile.
4. Confirm there are no duplicated navigation buttons or duplicated headers.
5. Open Search, Favorites and Profile and verify the title is centered and the side buttons remain clickable.
6. Scroll long content on Search, Favorites, Profile and product screens; the bottom navigation must stay fixed.
7. Return to Feed and verify vertical page scrolling is disabled while product interactions still work.
8. Swipe a product left and right and verify exactly one action occurs.
9. Close any sheet/modal with one tap; the tap must not pass through to controls behind it.
10. For an admin account, confirm the Admin item is present immediately and opens `/admin`.
11. For a non-admin account, confirm the Admin item is absent.
12. Rotate to landscape and back; navigation and header must remain usable.

## Pass criteria

- No double taps are required.
- No ghost clicks occur.
- No UI element appears several seconds after the screen is already usable, except data that genuinely arrives from the network.
- No header or navigation duplicates.
- Non-feed screens scroll normally.
- Feed remains fullscreen.

## Failure report format

For every failure record:

- device and browser;
- screen;
- exact taps performed;
- expected behavior;
- actual behavior;
- screenshot or screen recording.
