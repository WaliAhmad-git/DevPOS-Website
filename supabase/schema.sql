-- MakkahFoodsPOS trial & sales site — Supabase schema
-- Run in the Supabase SQL editor. Auth users live in auth.users (Supabase Auth);
-- everything here hangs off that via user_id.

create table if not exists plan_limits (
  key text primary key,
  value int not null
);
insert into plan_limits (key, value) values ('trial_attempts_default', 5)
  on conflict (key) do nothing;

create table if not exists accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  trial_attempts_remaining int not null default 5,
  has_seen_key_screen boolean not null default false,
  selected_tier text check (selected_tier in ('basic', 'advanced')) default null,
  purchase_status text check (purchase_status in ('none', 'pending_payment', 'paid')) not null default 'none',
  created_at timestamptz not null default now()
);

create table if not exists trial_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references accounts(user_id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text check (end_reason in ('shutdown_button', 'tab_closed', 'timeout', null)),
  demo_session_token text not null,
  showed_key_screen boolean not null default false
);

create table if not exists license_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references accounts(user_id) on delete cascade,
  key_string text not null unique,      -- e.g. MFUK-1XX9-XX0X-X8XX-2026
  tier text check (tier in ('basic', 'advanced')) not null,
  activation_date date not null,
  expiry_date date not null,
  issued_at timestamptz not null default now(),
  purchase_id uuid
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references accounts(user_id) on delete cascade,
  tier text check (tier in ('basic', 'advanced')) not null,
  amount_gbp numeric(8,2) not null,
  status text check (status in ('pending_payment', 'paid', 'failed')) not null default 'pending_payment',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table license_keys
  add constraint license_keys_purchase_fk foreign key (purchase_id) references purchases(id);

-- Row Level Security: users only ever see their own rows.
alter table accounts enable row level security;
alter table trial_sessions enable row level security;
alter table license_keys enable row level security;
alter table purchases enable row level security;

create policy "own account" on accounts for select using (auth.uid() = user_id);
create policy "own sessions" on trial_sessions for select using (auth.uid() = user_id);
create policy "own keys" on license_keys for select using (auth.uid() = user_id);
create policy "own purchases" on purchases for select using (auth.uid() = user_id);
-- All writes go through server-side API routes using the service-role key,
-- which bypasses RLS — that's intentional (attempt-counting and key issuance
-- must not be client-editable).

-- Create the accounts row automatically on signup.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_attempts int;
begin
  select value into default_attempts from plan_limits where key = 'trial_attempts_default';
  insert into public.accounts (user_id, email, trial_attempts_remaining)
  values (new.id, new.email, coalesce(default_attempts, 5));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
