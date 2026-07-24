-- DRIPLY test seller seed
-- Run once in Supabase SQL Editor.
-- Safe to run repeatedly: fixed product UUIDs are updated instead of duplicated.

begin;

do $$
begin
  if not exists (select 1 from public.profiles where lower(username) = 'kaskitk') then
    raise exception 'Profile @kaskitk was not found. Sign in with that account once before running this seed.';
  end if;
end $$;

update public.profiles
set
  display_name = 'Ivan Archive',
  city = 'Санкт-Петербург',
  country_code = 'RU',
  bio = 'Винтаж, streetwear и редкие вещи. Отправка по стране, встреча в Санкт-Петербурге.',
  is_verified = true,
  rating = 4.90,
  updated_at = now()
where lower(username) = 'kaskitk';

insert into public.products (
  id, seller_id, title, brand, category, description, size, color,
  condition, price, currency, country_code, city, delivery, status,
  views_count, favorites_count, created_at, updated_at
)
select
  seed.id,
  profile.id,
  seed.title,
  seed.brand,
  seed.category,
  seed.description,
  seed.size,
  seed.color,
  seed.condition,
  seed.price,
  'RUB',
  'RU',
  'Санкт-Петербург',
  'Личная встреча или отправка СДЭК',
  'active',
  seed.views_count,
  seed.favorites_count,
  now() - seed.age,
  now()
from public.profiles profile
cross join (
  values
    ('a1000000-0000-4000-8000-000000000001'::uuid, 'Carhartt Detroit Jacket', 'Carhartt', 'Куртки', 'Плотная рабочая куртка. Без дыр и пятен, красивый винтажный фейд.', 'L', 'Коричневый', 'Отличное', 28900::numeric, 184, 23, interval '2 days'),
    ('a1000000-0000-4000-8000-000000000002'::uuid, 'Nike Air Max 95', 'Nike', 'Кроссовки', 'Оригинал. Носились аккуратно, подошва без критичного износа.', '43', 'Серебристый', 'Хорошее', 17900::numeric, 311, 41, interval '5 hours'),
    ('a1000000-0000-4000-8000-000000000003'::uuid, 'Stussy Basic Hoodie', 'Stussy', 'Худи', 'Тяжёлый хлопок, свободная посадка. Принт без трещин.', 'XL', 'Чёрный', 'Отличное', 14900::numeric, 127, 18, interval '1 day'),
    ('a1000000-0000-4000-8000-000000000004'::uuid, 'Adidas Campus 00s', 'Adidas', 'Кроссовки', 'Замша в хорошем состоянии. Полный комплект с коробкой.', '42', 'Серый', 'Отличное', 13900::numeric, 206, 29, interval '3 days'),
    ('a1000000-0000-4000-8000-000000000005'::uuid, 'Levi''s 501 Vintage', 'Levi''s', 'Джинсы', 'Винтажные прямые джинсы с естественными потёртостями.', 'W32 L32', 'Синий', 'Хорошее', 7900::numeric, 95, 12, interval '6 days'),
    ('a1000000-0000-4000-8000-000000000006'::uuid, 'The North Face Nuptse', 'The North Face', 'Пуховики', 'Тёплый пуховик, объём сохранён. Все молнии работают.', 'M', 'Чёрный', 'Отличное', 25900::numeric, 358, 52, interval '8 hours'),
    ('a1000000-0000-4000-8000-000000000007'::uuid, 'New Balance 2002R', 'New Balance', 'Кроссовки', 'Удобная повседневная пара. Чистые внутри и снаружи.', '44', 'Бежевый', 'Хорошее', 15900::numeric, 143, 21, interval '4 days'),
    ('a1000000-0000-4000-8000-000000000008'::uuid, 'Supreme Box Logo Tee', 'Supreme', 'Футболки', 'Плотная футболка, ровный ворот, аккуратный принт.', 'L', 'Белый', 'Отличное', 9900::numeric, 269, 37, interval '12 hours')
) as seed(id, title, brand, category, description, size, color, condition, price, views_count, favorites_count, age)
where lower(profile.username) = 'kaskitk'
on conflict (id) do update set
  seller_id = excluded.seller_id,
  title = excluded.title,
  brand = excluded.brand,
  category = excluded.category,
  description = excluded.description,
  size = excluded.size,
  color = excluded.color,
  condition = excluded.condition,
  price = excluded.price,
  currency = excluded.currency,
  country_code = excluded.country_code,
  city = excluded.city,
  delivery = excluded.delivery,
  status = excluded.status,
  views_count = excluded.views_count,
  favorites_count = excluded.favorites_count,
  updated_at = now();

-- Replace only the images belonging to these fixed test products.
delete from public.product_images
where product_id in (
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'a1000000-0000-4000-8000-000000000002'::uuid,
  'a1000000-0000-4000-8000-000000000003'::uuid,
  'a1000000-0000-4000-8000-000000000004'::uuid,
  'a1000000-0000-4000-8000-000000000005'::uuid,
  'a1000000-0000-4000-8000-000000000006'::uuid,
  'a1000000-0000-4000-8000-000000000007'::uuid,
  'a1000000-0000-4000-8000-000000000008'::uuid
);

insert into public.product_images (id, product_id, url, position, is_cover)
values
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1200&q=85', 0, true),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85', 0, true),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=85', 0, true),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=85', 0, true),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&q=85', 0, true),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85', 0, true),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1200&q=85', 0, true),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85', 0, true);

commit;

-- Verification
select p.id, p.title, p.price, p.currency, p.status, i.url
from public.products p
join public.profiles pr on pr.id = p.seller_id
left join public.product_images i on i.product_id = p.id and i.is_cover = true
where lower(pr.username) = 'kaskitk'
order by p.created_at desc;
