-- Team Top Nutrition — Esquema Fase 1 (base de datos de clientes, sin pagos todavía)
-- Correr esto completo en Supabase → SQL Editor, una sola vez, sobre un proyecto nuevo.

create table if not exists plans (
  code       text primary key,          -- 'reset-7d' | 'perdida-peso' | 'recomposicion' | 'protocolo-gratis'
  name       text not null,
  price_clp  integer,                   -- NULL = precio aún no definido (TODO: completar)
  price_usd  numeric(10,2),             -- NULL = precio aún no definido (TODO: completar)
  is_free    boolean not null default false,
  active     boolean not null default true
);

create table if not exists customers (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  email                 text,
  whatsapp_phone        text not null unique,
  country_guess         text,                          -- 'CL' | 'other' (se completa en Fase 2/3 con el selector de moneda)
  first_source          text,                          -- 'programas_cta' | 'protocolo_gratis' | 'diagnostico' | 'manual'
  diagnostico_score     integer,
  diagnostico_plan_code text references plans(code),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references customers(id),
  plan_code         text not null references plans(code),
  currency          text check (currency in ('CLP','USD')),      -- NULL hasta que exista pasarela (Fase 2/3)
  amount            numeric(10,2),                                -- NULL hasta que exista pasarela (Fase 2/3)
  payment_provider  text not null default 'none' check (payment_provider in ('flow','paypal','manual','none')),
  provider_order_id text,
  payment_link_url  text,
  status            text not null default 'pending'
                      check (status in ('pending','link_generated','paid','failed','expired','canceled','refunded')),
  metadata          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  updated_at        timestamptz not null default now()
);

create table if not exists payment_events (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id),
  provider     text not null,
  event_type   text,
  raw_payload  jsonb not null,
  received_at  timestamptz not null default now()
);

-- Planes conocidos hoy en el sitio (nombres exactos que usa js/main.js).
-- TODO: completar price_clp / price_usd apenas Andrea defina los precios reales.
insert into plans (code, name, price_clp, price_usd, is_free) values
  ('reset-7d',        'Reset Metabólico 7 Días',                          null, null, false),
  ('perdida-peso',    'Pérdida de Peso Acelerada',                        null, null, false),
  ('recomposicion',   'Recomposición Corporal',                           null, null, false),
  ('protocolo-gratis','Protocolo de Desinflamación Express 72h (GRATIS)', 0,    0,    true)
on conflict (code) do nothing;

-- Row Level Security: solo la cuenta autenticada de Andrea puede leer.
-- Las escrituras (crear cliente/orden) solo las hace la Edge Function con la service_role key,
-- que ignora RLS por completo — por eso no hace falta una política de INSERT para el navegador.
alter table customers enable row level security;
alter table orders enable row level security;
alter table payment_events enable row level security;
alter table plans enable row level security;

create policy "Andrea puede leer clientes" on customers
  for select using (auth.role() = 'authenticated');

create policy "Andrea puede leer órdenes" on orders
  for select using (auth.role() = 'authenticated');

create policy "Andrea puede leer eventos de pago" on payment_events
  for select using (auth.role() = 'authenticated');

create policy "Cualquiera puede leer los planes" on plans
  for select using (true);
