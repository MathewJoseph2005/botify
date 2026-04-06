-- Vibe credits persistence tables
-- Run in Supabase SQL editor before using credit purchase features.

create table if not exists public.user_credits (
  user_id bigint primary key references public.users(user_id) on delete cascade,
  credits_balance integer not null default 20,
  total_purchased integer not null default 0,
  total_used integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_plans (
  id text primary key,
  name text not null,
  credits integer not null check (credits > 0),
  price_usd numeric(10,2) not null check (price_usd >= 0),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id bigserial primary key,
  user_id bigint not null references public.users(user_id) on delete cascade,
  transaction_type text not null,
  credits_delta integer not null,
  amount_usd numeric(10,2) not null default 0,
  status text not null default 'succeeded',
  reference text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_transactions_user_created
  on public.credit_transactions(user_id, created_at desc);

insert into public.credit_plans (id, name, credits, price_usd, description, is_active, sort_order)
values
  ('starter', 'Starter', 25, 5.00, 'Best for trying Vibe Code', true, 1),
  ('pro', 'Pro', 100, 15.00, 'For frequent bot generation', true, 2),
  ('scale', 'Scale', 300, 35.00, 'For teams and high volume', true, 3)
on conflict (id) do update
set
  name = excluded.name,
  credits = excluded.credits,
  price_usd = excluded.price_usd,
  description = excluded.description,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
