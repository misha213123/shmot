-- DRIPLY production Row Level Security
-- Backend service-role requests continue to bypass RLS.
-- Browser/Realtime access is restricted to public marketplace data and the current user's rows.

begin;

create or replace function public.is_driply_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = check_user
  );
$$;

revoke all on function public.is_driply_admin(uuid) from public;
grant execute on function public.is_driply_admin(uuid) to authenticated;

do $$
declare
  app_table_name text;
begin
  foreach app_table_name in array array[
    'admin_roles','chat_messages','conversations','deals','favorites','follows',
    'notifications','price_offers','product_images','product_reports','product_views',
    'products','profiles','reservations','reviews','swipe_actions'
  ] loop
    if to_regclass(format('public.%I', app_table_name)) is not null then
      execute format('alter table public.%I enable row level security', app_table_name);
      execute format('alter table public.%I force row level security', app_table_name);
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'admin_roles','chat_messages','conversations','deals','favorites','follows',
        'notifications','price_offers','product_images','product_reports','product_views',
        'products','profiles','reservations','reviews','swipe_actions'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', item.policyname, item.schemaname, item.tablename);
  end loop;
end $$;

create policy profiles_public_read on public.profiles
for select to anon, authenticated
using (true);

create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_driply_admin())
with check (id = auth.uid() or public.is_driply_admin());

create policy products_public_read on public.products
for select to anon, authenticated
using (status = 'active' or seller_id = auth.uid() or public.is_driply_admin());

create policy products_insert_owner on public.products
for insert to authenticated
with check (seller_id = auth.uid() or public.is_driply_admin());

create policy products_update_owner on public.products
for update to authenticated
using (seller_id = auth.uid() or public.is_driply_admin())
with check (seller_id = auth.uid() or public.is_driply_admin());

create policy products_delete_owner on public.products
for delete to authenticated
using (seller_id = auth.uid() or public.is_driply_admin());

create policy product_images_public_read on public.product_images
for select to anon, authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_images.product_id
      and (p.status = 'active' or p.seller_id = auth.uid() or public.is_driply_admin())
  )
);

create policy product_images_owner_write on public.product_images
for all to authenticated
using (
  exists (select 1 from public.products p where p.id = product_images.product_id and (p.seller_id = auth.uid() or public.is_driply_admin()))
)
with check (
  exists (select 1 from public.products p where p.id = product_images.product_id and (p.seller_id = auth.uid() or public.is_driply_admin()))
);

do $$
declare
  participant_expr text;
begin
  if to_regclass('public.conversations') is null then return; end if;

  if exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='buyer_id')
     and exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='seller_id') then
    participant_expr := '(buyer_id = auth.uid() or seller_id = auth.uid() or public.is_driply_admin())';
  elsif exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='participant_one_id')
     and exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='participant_two_id') then
    participant_expr := '(participant_one_id = auth.uid() or participant_two_id = auth.uid() or public.is_driply_admin())';
  elsif exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='user_one_id')
     and exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='user_two_id') then
    participant_expr := '(user_one_id = auth.uid() or user_two_id = auth.uid() or public.is_driply_admin())';
  else
    participant_expr := 'public.is_driply_admin()';
  end if;

  execute format('create policy conversations_participants_select on public.conversations for select to authenticated using %s', participant_expr);
  execute format('create policy conversations_participants_insert on public.conversations for insert to authenticated with check %s', participant_expr);
  execute format('create policy conversations_participants_update on public.conversations for update to authenticated using %s with check %s', participant_expr, participant_expr);
end $$;

do $$
declare
  conversation_expr text;
  sender_check text := 'true';
begin
  if to_regclass('public.chat_messages') is null then return; end if;

  if exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='buyer_id')
     and exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='seller_id') then
    conversation_expr := 'exists (select 1 from public.conversations c where c.id = chat_messages.conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_driply_admin()))';
  elsif exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='participant_one_id')
     and exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='participant_two_id') then
    conversation_expr := 'exists (select 1 from public.conversations c where c.id = chat_messages.conversation_id and (c.participant_one_id = auth.uid() or c.participant_two_id = auth.uid() or public.is_driply_admin()))';
  elsif exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='user_one_id')
     and exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='conversations' and c.column_name='user_two_id') then
    conversation_expr := 'exists (select 1 from public.conversations c where c.id = chat_messages.conversation_id and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid() or public.is_driply_admin()))';
  else
    conversation_expr := 'public.is_driply_admin()';
  end if;

  if exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='chat_messages' and c.column_name='sender_id') then
    sender_check := '(sender_id = auth.uid() or public.is_driply_admin())';
  end if;

  execute format('create policy chat_messages_participants_select on public.chat_messages for select to authenticated using (%s)', conversation_expr);
  execute format('create policy chat_messages_participants_insert on public.chat_messages for insert to authenticated with check ((%s) and %s)', conversation_expr, sender_check);
end $$;

do $$
declare
  app_table_name text;
  owner_column text;
  candidates text[];
  candidate text;
  owner_expression text;
begin
  foreach app_table_name in array array[
    'favorites','follows','notifications','price_offers','product_reports',
    'product_views','reservations','reviews','swipe_actions','deals'
  ] loop
    if to_regclass(format('public.%I', app_table_name)) is null then continue; end if;

    candidates := case app_table_name
      when 'favorites' then array['user_id','profile_id']
      when 'follows' then array['follower_id','user_id']
      when 'notifications' then array['user_id','recipient_id','profile_id']
      when 'price_offers' then array['buyer_id','user_id','sender_id']
      when 'product_reports' then array['reporter_id','user_id']
      when 'product_views' then array['viewer_id','user_id','profile_id']
      when 'reservations' then array['buyer_id','user_id','profile_id']
      when 'reviews' then array['reviewer_id','author_id','user_id']
      when 'swipe_actions' then array['user_id','profile_id']
      when 'deals' then array['buyer_id','user_id']
      else array['user_id']
    end;

    owner_column := null;
    foreach candidate in array candidates loop
      if exists (
        select 1 from information_schema.columns c
        where c.table_schema='public' and c.table_name=app_table_name and c.column_name=candidate
      ) then owner_column := candidate; exit; end if;
    end loop;

    if owner_column is null then
      owner_expression := 'public.is_driply_admin()';
    else
      owner_expression := format('(%I = auth.uid() or public.is_driply_admin())', owner_column);
    end if;

    execute format('create policy %I on public.%I for select to authenticated using %s', app_table_name || '_owner_select', app_table_name, owner_expression);
    execute format('create policy %I on public.%I for insert to authenticated with check %s', app_table_name || '_owner_insert', app_table_name, owner_expression);
    execute format('create policy %I on public.%I for update to authenticated using %s with check %s', app_table_name || '_owner_update', app_table_name, owner_expression, owner_expression);
    execute format('create policy %I on public.%I for delete to authenticated using %s', app_table_name || '_owner_delete', app_table_name, owner_expression);
  end loop;
end $$;

create policy admin_roles_admin_read on public.admin_roles
for select to authenticated
using (user_id = auth.uid() or public.is_driply_admin());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.chat_messages; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.conversations; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  end if;
end $$;

commit;
