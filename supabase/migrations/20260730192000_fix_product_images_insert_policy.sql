-- Repair product-images Storage policies.
-- Authenticated users may upload only into their own top-level folder:
--   <auth.uid()>/<generated-file-name>

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_owner_insert" on storage.objects;
drop policy if exists "product_images_owner_update" on storage.objects;
drop policy if exists "product_images_owner_delete" on storage.objects;
drop policy if exists "product_images_authenticated_insert" on storage.objects;

create policy "product_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

create policy "product_images_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "product_images_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = (select auth.uid()::text)
)
with check (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "product_images_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);
