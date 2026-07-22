# Recommendation System

## Goal
Rank active listings for each buyer so the first session quickly produces a save, product open or seller message.

## 1. Data collected

### Explicit preferences
- city
- categories
- clothing sizes
- shoe sizes
- favorite brands
- price range
- gender/style preference

### Behavioral signals
- card impression
- swipe left
- save/right swipe
- product open
- gallery depth
- dwell time
- seller profile open
- follow
- share
- message started
- reserve/purchase signal
- report/block

## 2. Cold start
For a new buyer, build the feed from:
- 35% selected categories
- 20% favorite brands
- 15% matching sizes
- 10% same city
- 10% popular listings
- 10% exploration

## 3. MVP ranking score

```text
score =
  category_match * 25
+ brand_match * 20
+ size_match * 20
+ price_match * 10
+ city_match * 8
+ followed_seller * 12
+ freshness * 10
+ popularity * 6
+ exploration * 5
- hard_exclusion_penalties
```

Hard exclusions receive a very large negative score:
- own listing
- unavailable listing
- blocked seller
- already skipped listing

## 4. Behavioral weight updates

Positive signals:
- message seller: +8
- save: +6
- follow seller: +6
- share: +5
- seller profile open: +4
- product open: +2
- view all images: +2

Negative signals:
- swipe left: -2
- immediate close: -1
- report/block: hard exclusion

Weights decay over time so recent behavior matters more than behavior from months ago.

## 5. Popularity
Popularity must use rates, not raw totals:

```text
popularity =
  save_rate * 40
+ message_rate * 50
+ share_rate * 20
+ freshness
- report_penalty
```

## 6. Diversity rules
- maximum two consecutive items from one category
- maximum two consecutive items from one brand
- maximum one item from the same seller in the next ten cards
- reserve 10–20% of impressions for exploration
- guarantee initial impressions for new listings and sellers

## 7. Later stages
After enough interaction data:
1. Item-to-item similarity.
2. Collaborative filtering.
3. Text and image embeddings.
4. Store vectors in pgvector/Supabase Vector.
5. Learn-to-rank model.
6. A/B tests and contextual bandits.

## 8. Recommendation metrics
- save rate
- product-open rate
- message rate
- first-session activation
- D1/D7 retention
- diversity by category, brand and seller
- impressions required before first message
