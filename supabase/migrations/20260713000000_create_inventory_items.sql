-- Inventory / stock management for organisations.

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  item_name text not null,
  category text not null check (category in ('food', 'clothing', 'equipment', 'other')),
  quantity integer not null default 0 check (quantity >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_organisation_id_idx
  on inventory_items (organisation_id);

-- Keep updated_at current on every row change.
create or replace function set_inventory_items_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists inventory_items_set_updated_at on inventory_items;
create trigger inventory_items_set_updated_at
  before update on inventory_items
  for each row
  execute function set_inventory_items_updated_at();

-- RLS: same private pattern as donations — only the owning organisation
-- (matched via organisations.owner_id = auth.uid()) may touch its rows.
alter table inventory_items enable row level security;

drop policy if exists "Organisations can view their own inventory" on inventory_items;
create policy "Organisations can view their own inventory"
  on inventory_items
  for select
  using (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Organisations can insert their own inventory" on inventory_items;
create policy "Organisations can insert their own inventory"
  on inventory_items
  for insert
  with check (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Organisations can update their own inventory" on inventory_items;
create policy "Organisations can update their own inventory"
  on inventory_items
  for update
  using (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  )
  with check (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Organisations can delete their own inventory" on inventory_items;
create policy "Organisations can delete their own inventory"
  on inventory_items
  for delete
  using (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );
