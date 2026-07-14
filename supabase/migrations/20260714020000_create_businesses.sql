-- Business account type: local businesses that can offer surplus stock to
-- charities, alongside the existing organisation/volunteer account types.

-- ── Businesses ─────────────────────────────────────────────────────────────
-- Same structure and ownership pattern as `volunteers`: the row's primary
-- key IS the auth.users id, not a separate FK column.

create table if not exists businesses (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table businesses enable row level security;

drop policy if exists "Businesses can view their own row" on businesses;
create policy "Businesses can view their own row"
  on businesses
  for select
  using (id = auth.uid());

drop policy if exists "Businesses can insert their own row" on businesses;
create policy "Businesses can insert their own row"
  on businesses
  for insert
  with check (id = auth.uid());

drop policy if exists "Businesses can update their own row" on businesses;
create policy "Businesses can update their own row"
  on businesses
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Businesses can delete their own row" on businesses;
create policy "Businesses can delete their own row"
  on businesses
  for delete
  using (id = auth.uid());

-- ── Business offers ──────────────────────────────────────────────────────
-- What a business is making available to charities. `quantity` is free text
-- (not integer) since a business might say "bulk" or "pallet" rather than an
-- exact count.

create table if not exists business_offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references auth.users(id) on delete cascade,
  item_description text not null,
  category text not null check (category in ('food', 'clothing', 'equipment', 'other')),
  quantity text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists business_offers_business_id_idx
  on business_offers (business_id);

-- RLS: same private ownership pattern as everywhere else, but keyed
-- directly to business_id = auth.uid() rather than going through an
-- organisations lookup.
alter table business_offers enable row level security;

drop policy if exists "Businesses can view their own offers" on business_offers;
create policy "Businesses can view their own offers"
  on business_offers
  for select
  using (business_id = auth.uid());

drop policy if exists "Businesses can insert their own offers" on business_offers;
create policy "Businesses can insert their own offers"
  on business_offers
  for insert
  with check (business_id = auth.uid());

drop policy if exists "Businesses can update their own offers" on business_offers;
create policy "Businesses can update their own offers"
  on business_offers
  for update
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

drop policy if exists "Businesses can delete their own offers" on business_offers;
create policy "Businesses can delete their own offers"
  on business_offers
  for delete
  using (business_id = auth.uid());
