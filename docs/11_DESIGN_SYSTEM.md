# Design System

## Visual direction
Use the supplied DRIPLY reference as the primary visual direction:
- warm white background
- near-black typography and actions
- large product photography
- rounded but restrained cards
- minimal monochrome interface
- strong spacing and hierarchy
- no purple neon visual language

## Navigation
Primary tabs:
- Feed
- Explore
- Create
- Likes
- Profile

## Core screens
- swipe feed
- product details
- seller profile/storefront
- explore/categories
- likes
- messages
- filters
- create listing
- personal profile
- admin moderation

## Components
- AppHeader
- BottomNavigation
- ProductSwipeCard
- ProductGallery
- ProductGridCard
- SellerInlineCard
- SellerHeader
- FollowButton
- MessageButton
- FilterSheet
- PriceRange
- SizeSelector
- ConditionSelector
- EmptyState
- ErrorState
- Skeleton

## Interaction rules
- Minimum touch target: 44×44 px.
- Feed swipe and gallery swipe must not conflict.
- Critical actions require visible feedback.
- Save/message actions use optimistic updates with rollback.
- Sold and reserved items are visually distinct.
- Every screen supports loading, empty and error states.

## Typography
Use a modern neutral sans-serif. Keep product price and primary actions visually dominant. Avoid decorative fonts in the production marketplace UI.
