create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.user_status as enum ('active', 'blocked', 'deleted');
create type public.product_status as enum ('draft', 'pending', 'active', 'reserved', 'sold', 'archived', 'rejected', 'deleted');
create type public.swipe_action as enum ('skip', 'save', 'like');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  username text,
  name text not null,
  avatar_url text,
  city text,
  bio text,
  role text not null default 'user',
  status public.user_status not null default 'active',
  is_verified boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id),
  title text not null,
  brand text,
  category text not null,
  gender text,
  size text,
  condition text not null,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'PLN',
  city text,
  description text,
  status public.product_status not null default 'draft',
  views_count integer not null default 0,
  saves_count integer not null default 0,
  messages_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  sold_at timestamptz
);

create index products_feed_idx on public.products(status, created_at desc);
create index products_seller_idx on public.products(seller_id, status);
create index products_category_idx on public.products(category, size);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  unique(product_id, sort_order)
);

create table public.swipe_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  action public.swipe_action not null,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (follower_id <> seller_id),
  unique(follower_id, seller_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  product_id uuid not null references public.products(id),
  status text not null default 'active',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  unique(buyer_id, seller_id, product_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  type text not null default 'text',
  body text,
  media_url text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  deleted_at timestamptz
);

create index messages_conversation_idx on public.messages(conversation_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id),
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  comment text,
  status text not null default 'open',
  resolved_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id),
  event_name text not null,
  product_id uuid references public.products(id),
  seller_id uuid references public.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_user_idx on public.analytics_events(user_id, created_at desc);
