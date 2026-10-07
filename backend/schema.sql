create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student','faculty','vendor','resident','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  condition text not null check (condition in ('New','Good condition','Used')),
  price numeric(10,2) not null check (price >= 0),
  description text,
  image_url text,
  status text not null default 'active' check (status in ('active','sold','removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('Events','Notices','Services','Lost and found')),
  title text not null,
  body text not null,
  status text not null default 'active' check (status in ('active','removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'paid' check (status in ('pending','paid','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(order_id, product_id, buyer_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.community_posts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

-- Drop old policies so this script can safely be run again during development.
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('profiles','products','community_posts','orders','order_items','reviews','notifications') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy products_select_active on public.products for select using (status = 'active' or auth.uid() = seller_id);
create policy products_insert_own on public.products for insert to authenticated with check (auth.uid() = seller_id);
create policy products_update_own on public.products for update to authenticated using (auth.uid() = seller_id);
create policy products_delete_own on public.products for delete to authenticated using (auth.uid() = seller_id);

create policy posts_select_active on public.community_posts for select using (status='active' or auth.uid()=author_id);
create policy posts_insert_own on public.community_posts for insert to authenticated with check (auth.uid()=author_id);
create policy posts_update_own on public.community_posts for update to authenticated using (auth.uid()=author_id);
create policy posts_delete_own on public.community_posts for delete to authenticated using (auth.uid()=author_id);

create policy orders_select_own on public.orders for select to authenticated using (auth.uid()=buyer_id);
create policy orders_insert_own on public.orders for insert to authenticated with check (auth.uid()=buyer_id);
create policy orders_delete_own on public.orders for delete to authenticated using (auth.uid()=buyer_id);
create policy order_items_select_buyer_or_seller on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id=order_id and o.buyer_id=auth.uid()) or seller_id=auth.uid()
);
create policy order_items_insert_buyer on public.order_items for insert to authenticated with check (
  exists (select 1 from public.orders o where o.id=order_id and o.buyer_id=auth.uid())
);

create policy reviews_select_authenticated on public.reviews for select to authenticated using (true);
create policy reviews_insert_buyer on public.reviews for insert to authenticated with check (auth.uid()=buyer_id);
create policy reviews_update_buyer on public.reviews for update to authenticated using (auth.uid()=buyer_id) with check (auth.uid()=buyer_id);
create policy reviews_delete_buyer on public.reviews for delete to authenticated using (auth.uid()=buyer_id);

create policy notifications_select_own on public.notifications for select to authenticated using (auth.uid()=user_id);
create policy notifications_update_own on public.notifications for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.is_admin() returns boolean language sql security definer set search_path=public stable as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;
create policy admin_all_products on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_posts on public.community_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_select_profiles on public.profiles for select to authenticated using (public.is_admin() or auth.uid()=id);
create policy admin_all_notifications on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested_role text;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if requested_role not in ('student','faculty','vendor','resident') then requested_role := 'student'; end if;
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), requested_role)
  on conflict (id) do update set full_name=excluded.full_name, role=excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Product image storage
-- Creates a public bucket so product pictures can be displayed in marketplace cards and item details.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists product_images_insert_own on storage.objects;
create policy product_images_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists product_images_update_own on storage.objects;
create policy product_images_update_own on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and owner_id = auth.uid()::text)
with check (bucket_id = 'product-images' and owner_id = auth.uid()::text);

drop policy if exists product_images_delete_own on storage.objects;
create policy product_images_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and owner_id = auth.uid()::text);

-- Marketplace purchase + moderation notifications
create or replace function public.place_order(p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(10,2) := 0;
  v_item record;
  v_product public.products%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to place an order.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  loop
    if v_item.quantity is null or v_item.quantity < 1 then
      raise exception 'Invalid quantity.';
    end if;

    select * into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'A product in your cart no longer exists.';
    end if;
    if v_product.status <> 'active' then
      raise exception 'The item "%" is no longer available.', v_product.name;
    end if;
    if v_product.seller_id = auth.uid() then
      raise exception 'You cannot purchase your own listing.';
    end if;

    v_total := v_total + (v_product.price * v_item.quantity);
  end loop;

  insert into public.orders (buyer_id, total, status)
  values (auth.uid(), v_total, 'paid')
  returning id into v_order_id;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  loop
    select * into v_product from public.products where id=v_item.product_id;

    insert into public.order_items
      (order_id, product_id, seller_id, product_name, quantity, unit_price)
    values
      (v_order_id, v_product.id, v_product.seller_id, v_product.name, v_item.quantity, v_product.price);

    update public.products
    set status='sold'
    where id=v_product.id;

    insert into public.notifications (user_id, title, message)
    values (
      v_product.seller_id,
      'Your item was sold',
      'Your listing "' || v_product.name || '" has been purchased. Check My Account to view the order.'
    );
  end loop;

  insert into public.notifications (user_id, title, message)
  values (
    auth.uid(),
    'Order placed',
    'Your order #' || left(v_order_id::text,8) || ' was created successfully.'
  );

  return v_order_id;
end;
$$;

grant execute on function public.place_order(jsonb) to authenticated;

create or replace function public.notify_product_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_row record;
begin
  if new.status = 'removed' and old.status is distinct from 'removed' then
    if new.seller_id is not null then
      insert into public.notifications (user_id, title, message)
      values (
        new.seller_id,
        'Listing removed',
        'Your listing "' || new.name || '" was removed by an administrator. Please check your account for more information.'
      );
    end if;

    for admin_row in select id from public.profiles where role='admin' loop
      insert into public.notifications (user_id, title, message)
      values (
        admin_row.id,
        'Listing removed by admin',
        'The listing "' || new.name || '" was removed from the marketplace.'
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists product_removed_notification on public.products;
create trigger product_removed_notification
after update of status on public.products
for each row execute procedure public.notify_product_removed();
