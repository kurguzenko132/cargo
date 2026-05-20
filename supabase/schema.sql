create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  price integer not null check (price >= 0),
  sizes text[] not null default array['S', 'M', 'L'],
  image text not null,
  in_stock boolean not null default true,
  description text not null default 'Описание товара скоро появится.',
  tag text not null default 'NEW',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  comment text,
  total integer not null check (total >= 0),
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  size text,
  qty integer not null check (qty > 0),
  price integer not null check (price >= 0),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

insert into public.products (title, category, price, sizes, image, in_stock, description, tag)
values
  ('Jacket Minimal Grey', 'Куртки', 120, array['M','L','XL'], 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=80', true, 'Минималистичная куртка в сером оттенке, плотная посадка и чистый силуэт.', 'NEW'),
  ('Boxy T-Shirt Basic', 'Футболки', 45, array['S','M','L'], 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=80', true, 'Базовая футболка свободного кроя из плотного хлопка.', 'BASIC'),
  ('Oversized Hoodie Ash', 'Худи', 98, array['S','M','L','XL'], 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1000&q=80', true, 'Оверсайз худи с мягкой фактурой и плотным капюшоном.', 'HIT'),
  ('Cargo Pants Black', 'Брюки', 86, array['S','M','L'], 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1000&q=80', true, 'Свободные брюки cargo с удобными карманами.', 'DROP'),
  ('Linen Shirt Milk', 'Рубашки', 72, array['S','M','L'], 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80', true, 'Лёгкая рубашка молочного оттенка для базового гардероба.', 'SOFT'),
  ('Classic Coat Sand', 'Пальто', 180, array['M','L'], 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?auto=format&fit=crop&w=1000&q=80', true, 'Пальто с чистой линией плеча и премиальной фактурой.', 'PREMIUM')
on conflict do nothing;

create table if not exists public.site_settings (
  id text primary key default 'main',
  promo_image text not null default '/images/default-promo.png',
  logo_image text not null default '/images/default-logo.png',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, promo_image, logo_image)
values ('main', '/images/default-promo.png', '/images/default-logo.png')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

notify pgrst, 'reload schema';

-- Orders CRM upgrade
alter table public.orders
add column if not exists order_type text not null default 'site';

alter table public.orders
add column if not exists external_link text;

alter table public.orders
add column if not exists external_platform text;

alter table public.orders
add column if not exists external_details text;

alter table public.orders
add column if not exists manager_note text;

update public.orders
set order_type = case when external_link is not null and external_link <> '' then 'link' else coalesce(order_type, 'site') end;

notify pgrst, 'reload schema';

-- Profit / purchasing analytics fields
alter table public.products
add column if not exists purchase_price integer not null default 0 check (purchase_price >= 0);

alter table public.order_items
add column if not exists purchase_price integer not null default 0 check (purchase_price >= 0);

notify pgrst, 'reload schema';

-- Product gallery and visible pseudo-discount fields
alter table public.products
add column if not exists old_price integer not null default 0 check (old_price >= 0);

alter table public.products
add column if not exists images text[] not null default array[]::text[];

update public.products
set images = array[image]
where (images is null or cardinality(images) = 0) and image is not null and image <> '';

notify pgrst, 'reload schema';

-- User profile order ownership fields
alter table public.orders
add column if not exists user_id uuid;

alter table public.orders
add column if not exists customer_email text;

notify pgrst, 'reload schema';

-- Storage bucket for site/product images.
-- The app also creates this bucket automatically from /api/upload-image,
-- but this SQL lets you prepare it manually in Supabase.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cargo-media',
  'cargo-media',
  true,
  7340032,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 7340032,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
