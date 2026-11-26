-- ============================================================
-- MULTISHOP · Esquema completo de base de datos (Supabase)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Es idempotente: se puede ejecutar varias veces sin perder datos.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PERFILES (extiende auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'cliente' check (role in ('cliente','admin')),
  balance numeric(12,2) not null default 0,
  is_blocked boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);

-- ------------------------------------------------------------
-- 2. CATEGORÍAS Y SUBCATEGORÍAS
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  image_url text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);
create index if not exists subcategories_category_idx on public.subcategories(category_id);

-- ------------------------------------------------------------
-- 3. PRODUCTOS
-- ------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2),
  stock integer not null default 0,
  sku text,
  delivery_type text not null default 'manual' check (delivery_type in ('manual','automatic')),
  delivery_instructions text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_offer boolean not null default false,
  is_new boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_subcategory_idx on public.products(subcategory_id);
create index if not exists products_active_idx on public.products(is_active);

-- ------------------------------------------------------------
-- 4. BANNERS
-- ------------------------------------------------------------
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  cta_label text,
  position text not null default 'home' check (position in ('home','category','popup')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. CARRITO (persistente en Supabase, un carrito activo por usuario)
-- ------------------------------------------------------------
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- ------------------------------------------------------------
-- 6. PEDIDOS
-- ------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_email text,
  customer_name text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'pendiente'
    check (status in ('pendiente','pagado','en_proceso','entregado','cancelado','rechazado')),
  payment_status text not null default 'pendiente'
    check (payment_status in ('pendiente','en_revision','aprobado','rechazado','reembolsado')),
  payment_method text not null default 'saldo'
    check (payment_method in ('saldo','transferencia','deposito','otro')),
  delivery_type text not null default 'manual' check (delivery_type in ('manual','automatic')),
  contact text,
  customer_notes text,
  admin_notes text,
  idempotency_key text unique,
  paid_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price numeric(12,2) not null default 0,
  quantity integer not null default 1,
  subtotal numeric(12,2) not null default 0,
  delivery_type text not null default 'manual',
  delivery_data text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ------------------------------------------------------------
-- 7. PAGOS
-- ------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  amount numeric(12,2) not null default 0,
  method text not null default 'transferencia',
  reference text,
  proof_url text,
  status text not null default 'pendiente'
    check (status in ('pendiente','en_revision','aprobado','rechazado')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists payments_status_idx on public.payments(status);

-- ------------------------------------------------------------
-- 8. SALDO / MOVIMIENTOS
-- ------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('credito','debito','ajuste')),
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null default 0,
  description text,
  order_id uuid references public.orders(id) on delete set null,
  admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wallet_user_idx on public.wallet_transactions(user_id, created_at desc);

-- ------------------------------------------------------------
-- 9. CONFIGURACIÓN
-- ------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 10. NOTIFICACIONES
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ------------------------------------------------------------
-- 11. SOPORTE
-- ------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  subject text not null,
  message text not null,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'abierto' check (status in ('abierto','en_proceso','cerrado')),
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 11b. SOLICITUDES DE RECARGA DE SALDO
-- ------------------------------------------------------------
create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'transferencia',
  reference text,
  proof_url text,
  status text not null default 'pendiente'
    check (status in ('pendiente','aprobado','rechazado')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_topups_user_idx on public.wallet_topups(user_id, created_at desc);

alter table public.wallet_topups enable row level security;
drop policy if exists wallet_topups_own on public.wallet_topups;
create policy wallet_topups_own on public.wallet_topups for select
  using (auth.uid() = user_id or public.is_admin());

-- ------------------------------------------------------------
-- 12. REGISTRO DE ACTIVIDADES
-- ------------------------------------------------------------
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_email text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_logs_created_idx on public.admin_logs(created_at desc);

-- ------------------------------------------------------------
-- 13. COPIAS DE SEGURIDAD
-- ------------------------------------------------------------
create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_email text,
  size_bytes bigint not null default 0,
  records_count integer not null default 0,
  tables_included jsonb not null default '[]'::jsonb,
  manifest jsonb not null default '{}'::jsonb,
  payload jsonb,
  checksum text,
  status text not null default 'completado' check (status in ('completado','fallido')),
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_events (
  id uuid primary key default gen_random_uuid(),
  backup_id uuid references public.backups(id) on delete cascade,
  backup_name text,
  action text not null check (action in ('crear','descargar','restaurar','eliminar','fallo')),
  status text not null default 'ok' check (status in ('ok','error')),
  message text,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  created_at timestamptz not null default now()
);
create index if not exists backup_events_created_idx on public.backup_events(created_at desc);

-- ------------------------------------------------------------
-- 14. FUNCIONES Y TRIGGERS
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','categories','subcategories','products','banners','carts','orders']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿Es administrador?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_blocked = false
  );
$$;

-- ------------------------------------------------------------
-- 15. RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.banners enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.settings enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.admin_logs enable row level security;
alter table public.backups enable row level security;
alter table public.backup_events enable row level security;

-- perfiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- catálogo público (solo activo)
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (is_active or public.is_admin());
drop policy if exists subcategories_public_read on public.subcategories;
create policy subcategories_public_read on public.subcategories for select using (is_active or public.is_admin());
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (is_active or public.is_admin());
drop policy if exists banners_public_read on public.banners;
create policy banners_public_read on public.banners for select using (is_active or public.is_admin());

-- carrito propio
drop policy if exists carts_own on public.carts;
create policy carts_own on public.carts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists cart_items_own on public.cart_items;
create policy cart_items_own on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- pedidos propios (escritura solo servidor)
drop policy if exists orders_own_read on public.orders;
create policy orders_own_read on public.orders for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists order_items_own_read on public.order_items;
create policy order_items_own_read on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
drop policy if exists payments_own_read on public.payments;
create policy payments_own_read on public.payments for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists wallet_own_read on public.wallet_transactions;
create policy wallet_own_read on public.wallet_transactions for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists support_own on public.support_tickets;
create policy support_own on public.support_tickets for select using (auth.uid() = user_id or public.is_admin());

-- configuración: lectura pública de la clave "store" (datos de tienda), resto solo admin
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings for select using (key in ('store','maintenance') or public.is_admin());

-- logs y backups: solo admin
drop policy if exists admin_logs_admin on public.admin_logs;
create policy admin_logs_admin on public.admin_logs for select using (public.is_admin());
drop policy if exists backups_admin on public.backups;
create policy backups_admin on public.backups for select using (public.is_admin());
drop policy if exists backup_events_admin on public.backup_events;
create policy backup_events_admin on public.backup_events for select using (public.is_admin());

-- ------------------------------------------------------------
-- 16. STORAGE (imágenes públicas y comprobantes privados)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('comprobantes', 'comprobantes', false) on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select using (bucket_id = 'media');

-- comprobantes: privado. La ruta es <carpeta>/<uuid>/<archivo>, así que el dueño
-- se comprueba por carpeta (independiente de cómo guarde Supabase el propietario).
drop policy if exists comprobantes_owner_read on storage.objects;
create policy comprobantes_owner_read on storage.objects for select
  using (
    bucket_id = 'comprobantes'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

-- subida de imágenes: solo administradores
drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

-- subida de comprobantes: solo en la carpeta del propio usuario
drop policy if exists comprobantes_owner_insert on storage.objects;
create policy comprobantes_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists comprobantes_owner_update on storage.objects;
create policy comprobantes_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'comprobantes'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  )
  with check (
    bucket_id = 'comprobantes'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

-- ------------------------------------------------------------
-- 17. DATOS INICIALES (solo las 2 categorías solicitadas)
-- ------------------------------------------------------------
insert into public.categories (name, slug, description, icon, sort_order, is_active) values
  ('FREE FIRE', 'free-fire', 'Diamantes, pases, membresías y cuentas de Free Fire.', '🔥', 1, true),
  ('STREAMING', 'streaming', 'Netflix, YouTube Premium, Spotify y más servicios.', '🎬', 2, true)
on conflict (slug) do nothing;

insert into public.subcategories (category_id, name, slug, sort_order)
select c.id, v.name, v.slug, v.ord
from public.categories c
cross join (values
  ('Diamantes','diamantes',1),
  ('Pases','pases',2),
  ('Membresías','membresias',3),
  ('Cuentas Free Fire','cuentas-free-fire',4),
  ('Otros productos Free Fire','otros-productos-free-fire',5)
) as v(name, slug, ord)
where c.slug = 'free-fire'
on conflict (category_id, slug) do nothing;

insert into public.subcategories (category_id, name, slug, sort_order)
select c.id, v.name, v.slug, v.ord
from public.categories c
cross join (values
  ('Netflix','netflix',1),
  ('YouTube Premium','youtube-premium',2),
  ('Spotify','spotify',3),
  ('Otros servicios de streaming','otros-servicios-de-streaming',4)
) as v(name, slug, ord)
where c.slug = 'streaming'
on conflict (category_id, slug) do nothing;

insert into public.settings (key, value) values
  ('store', '{"name":"MULTISHOP","tagline":"Tienda digital premium","currency":"USD","whatsapp":"","support_email":"","payment_instructions":"Realiza el pago y envía el comprobante desde el detalle de tu pedido."}'::jsonb),
  ('maintenance', '{"enabled":false,"message":"Estamos realizando mejoras para brindarte una mejor experiencia.","image_url":"","estimated_date":""}'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- 18. CHECKOUT ATÓMICO Y ESCRITURA CON SESIÓN DE USUARIO
-- La aplicación no usa ninguna clave privada: cada operación se
-- ejecuta con el JWT del usuario y estas políticas/funciones.
-- ============================================================

-- Número de pedido legible y único.
create or replace function public.next_order_number()
returns text language plpgsql as $$
begin
  return 'MS-' || to_char(now(), 'YYMMDD') || '-' ||
         upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
end; $$;

-- Compra completa, atómica y a prueba de manipulación desde el navegador.
create or replace function public.create_order_from_cart(
  p_payment_method text default 'transferencia',
  p_contact text default null,
  p_notes text default null,
  p_idempotency text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_cart_id uuid;
  v_subtotal numeric(12,2) := 0;
  v_balance numeric(12,2);
  v_order public.orders%rowtype;
  v_item record;
  v_delivery text := 'manual';
  v_method text := case when p_payment_method = 'saldo' then 'saldo' else 'transferencia' end;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_profile.is_blocked then raise exception 'ACCOUNT_BLOCKED'; end if;

  if p_idempotency is not null then
    select * into v_order from public.orders
      where idempotency_key = p_idempotency and user_id = v_uid;
    if found then
      return jsonb_build_object('orderId', v_order.id, 'orderNumber', v_order.order_number, 'duplicated', true);
    end if;
  end if;

  select id into v_cart_id from public.carts where user_id = v_uid;
  if v_cart_id is null then raise exception 'EMPTY_CART'; end if;

  for v_item in
    select ci.product_id, ci.quantity, p.price, p.stock, p.is_active, p.name, p.delivery_type
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id
  loop
    if not v_item.is_active then raise exception 'PRODUCT_UNAVAILABLE:%', v_item.name; end if;
    if v_item.stock < v_item.quantity then raise exception 'INSUFFICIENT_STOCK:%', v_item.name; end if;
    v_subtotal := v_subtotal + (v_item.price * v_item.quantity);
    if v_item.delivery_type = 'automatic' then v_delivery := 'automatic'; end if;
  end loop;

  if v_subtotal <= 0 then raise exception 'EMPTY_CART'; end if;

  if v_method = 'saldo' then
    select balance into v_balance from public.profiles where id = v_uid for update;
    if coalesce(v_balance, 0) < v_subtotal then raise exception 'INSUFFICIENT_BALANCE'; end if;
  end if;

  insert into public.orders (
    order_number, user_id, customer_email, customer_name, subtotal, discount, total,
    status, payment_status, payment_method, delivery_type, contact, customer_notes,
    idempotency_key, paid_at
  ) values (
    public.next_order_number(), v_uid, v_profile.email, v_profile.full_name,
    v_subtotal, 0, v_subtotal,
    case when v_method = 'saldo' then 'pagado' else 'pendiente' end,
    case when v_method = 'saldo' then 'aprobado' else 'pendiente' end,
    v_method, v_delivery, p_contact, p_notes, p_idempotency,
    case when v_method = 'saldo' then now() else null end
  ) returning * into v_order;

  insert into public.order_items (
    order_id, product_id, product_name, product_image, unit_price, quantity, subtotal, delivery_type
  )
  select v_order.id, ci.product_id, p.name, p.image_url, p.price, ci.quantity,
         (p.price * ci.quantity), p.delivery_type
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id;

  update public.products p
    set stock = greatest(p.stock - ci.quantity, 0)
    from public.cart_items ci
    where ci.cart_id = v_cart_id and p.id = ci.product_id;

  if v_method = 'saldo' then
    update public.profiles set balance = balance - v_subtotal
      where id = v_uid returning balance into v_balance;

    insert into public.wallet_transactions (user_id, type, amount, balance_after, description, order_id)
    values (v_uid, 'debito', v_subtotal, v_balance, 'Compra ' || v_order.order_number, v_order.id);
  end if;

  insert into public.payments (order_id, user_id, amount, method, status, reviewed_at, review_notes)
  values (
    v_order.id, v_uid, v_subtotal, v_method,
    case when v_method = 'saldo' then 'aprobado' else 'pendiente' end,
    case when v_method = 'saldo' then now() else null end,
    case when v_method = 'saldo' then 'Pago automático con saldo' else null end
  );

  insert into public.notifications (user_id, title, body, type, link)
  values (
    v_uid,
    'Pedido ' || v_order.order_number || ' creado',
    case when v_method = 'saldo'
      then 'Tu pago con saldo fue aprobado. Estamos preparando tu entrega.'
      else 'Envía tu comprobante para verificar el pago y procesar tu pedido.' end,
    'pedido', '/compras/' || v_order.id
  );

  delete from public.cart_items where cart_id = v_cart_id;

  return jsonb_build_object('orderId', v_order.id, 'orderNumber', v_order.order_number);
end; $$;

revoke all on function public.create_order_from_cart(text, text, text, text) from public;
grant execute on function public.create_order_from_cart(text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 18b. PROTECCIONES: el cliente no puede alterar precios, saldo ni roles
-- ------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.role := old.role;
  new.balance := old.balance;
  new.is_blocked := old.is_blocked;
  new.notes := old.notes;
  new.email := old.email;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.orders_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if new.status <> 'cancelado' then new.status := old.status; end if;
  new.payment_status := old.payment_status;
  new.subtotal := old.subtotal;
  new.discount := old.discount;
  new.total := old.total;
  new.user_id := old.user_id;
  new.order_number := old.order_number;
  new.payment_method := old.payment_method;
  new.idempotency_key := old.idempotency_key;
  new.admin_notes := old.admin_notes;
  new.delivered_at := old.delivered_at;
  new.paid_at := old.paid_at;
  new.delivery_type := old.delivery_type;
  return new;
end; $$;

drop trigger if exists orders_guard on public.orders;
create trigger orders_guard before update on public.orders
  for each row execute function public.orders_guard();

create or replace function public.payments_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.amount := old.amount;
  new.order_id := old.order_id;
  new.user_id := old.user_id;
  new.method := old.method;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.review_notes := old.review_notes;
  if old.status = 'aprobado' or old.status = 'rechazado' then
    new.status := old.status;
  end if;
  return new;
end; $$;

drop trigger if exists payments_guard on public.payments;
create trigger payments_guard before update on public.payments
  for each row execute function public.payments_guard();

create or replace function public.wallet_topups_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.user_id := auth.uid();
  new.status := 'pendiente';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.review_notes := null;
  return new;
end; $$;

drop trigger if exists wallet_topups_guard on public.wallet_topups;
create trigger wallet_topups_guard before insert on public.wallet_topups
  for each row execute function public.wallet_topups_guard();

create or replace function public.support_tickets_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.user_id := auth.uid();
  new.status := 'abierto';
  new.admin_reply := null;
  new.replied_at := null;
  return new;
end; $$;

drop trigger if exists support_tickets_guard on public.support_tickets;
create trigger support_tickets_guard before insert on public.support_tickets
  for each row execute function public.support_tickets_guard();

-- ------------------------------------------------------------
-- 18c. POLÍTICAS DE ESCRITURA
-- ------------------------------------------------------------
-- Administradores: control total sobre las tablas de gestión.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','subcategories','products','banners','carts','cart_items',
    'orders','order_items','payments','wallet_transactions','wallet_topups','settings',
    'notifications','support_tickets','admin_logs','backups','backup_events'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t
    );
  end loop;
end $$;

-- Cliente: crear su solicitud de recarga, su ticket y marcar notificaciones.
drop policy if exists wallet_topups_insert_own on public.wallet_topups;
create policy wallet_topups_insert_own on public.wallet_topups for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists support_insert_own on public.support_tickets;
create policy support_insert_own on public.support_tickets for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cliente: adjuntar comprobante a su pago y cancelar su propio pedido.
drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists orders_update_own on public.orders;
create policy orders_update_own on public.orders for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage: el administrador publica imágenes; el cliente sube sus comprobantes.
drop policy if exists media_admin_write on storage.objects;
create policy media_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists comprobantes_owner_insert on storage.objects;
create policy comprobantes_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and owner = auth.uid());
