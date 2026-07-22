# Functional Specification

## Buyer
- Telegram sign-in
- onboarding preferences
- personalized feed
- left/right swipe
- product details and gallery
- search and filters
- favorites
- follow seller
- seller profile
- messages
- share/deep link
- report and block

## Seller
- all buyer features
- seller profile and storefront
- create/edit/archive listing
- image ordering and cover selection
- moderation status
- active/reserved/sold lifecycle
- listing statistics
- conversations linked to products

## Administrator
- pending listing queue
- approve/reject with reason
- user and seller management
- report resolution
- product hiding
- category and brand dictionaries
- audit log

## Product lifecycle
`draft -> pending -> active -> reserved -> sold`

Alternative transitions:
- `pending -> rejected -> draft`
- `active -> archived -> active`
- `reserved -> active`
- soft deletion from allowed states

## Feed rules
The feed excludes:
- the current user's listings
- sold, archived, rejected or deleted listings
- blocked sellers
- previously skipped items unless explicitly restored
- duplicate cards

## Error states
Every feature must implement loading, empty, retry and permission-denied states.
