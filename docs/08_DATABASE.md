# Database Model

## users
`id, telegram_id, username, name, avatar_url, city, bio, role, status, is_verified, preferences_json, created_at, updated_at`

Constraints:
- unique telegram_id
- index status and city

## products
`id, seller_id, title, brand, category, gender, size, condition, price, currency, city, description, status, views_count, saves_count, messages_count, created_at, published_at, sold_at`

Indexes:
- seller_id
- status + created_at
- category + size
- brand
- city
- price

## product_images
`id, product_id, storage_path, public_url, sort_order, is_cover, width, height, created_at`

## swipe_actions
`id, user_id, product_id, action, created_at`

Constraint:
- unique user_id + product_id for the primary swipe action

## favorites
`id, user_id, product_id, created_at`

Constraint:
- unique user_id + product_id

## follows
`id, follower_id, seller_id, created_at`

Constraint:
- unique follower_id + seller_id
- follower cannot follow self

## conversations
`id, buyer_id, seller_id, product_id, status, last_message_at, created_at`

## messages
`id, conversation_id, sender_id, type, body, media_url, created_at, read_at, deleted_at`

## reports
`id, reporter_id, target_type, target_id, reason, comment, status, resolved_by, created_at, resolved_at`

## moderation_logs
`id, admin_id, action, target_type, target_id, reason, metadata_json, created_at`

## analytics_events
`id, user_id, event_name, product_id, seller_id, metadata_json, created_at`

## Future tables
- transactions
- reviews
- referrals
- promotions
- seller_subscriptions
- notifications
