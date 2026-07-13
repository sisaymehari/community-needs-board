-- Grant deadline tracking for organisations.

create table if not exists grants (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  grant_name text not null,
  funder text,
  amount numeric,
  deadline date not null,
  status text not null default 'planned' check (status in ('planned', 'submitted', 'awarded', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists grants_organisation_id_idx
  on grants (organisation_id);

create index if not exists grants_deadline_idx
  on grants (deadline);

-- RLS: same private pattern as donations and inventory — only the owning
-- organisation (matched via organisations.owner_id = auth.uid()) may touch its rows.
alter table grants enable row level security;

drop policy if exists "Organisations can view their own grants" on grants;
create policy "Organisations can view their own grants"
  on grants
  for select
  using (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Organisations can insert their own grants" on grants;
create policy "Organisations can insert their own grants"
  on grants
  for insert
  with check (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Organisations can update their own grants" on grants;
create policy "Organisations can update their own grants"
  on grants
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

drop policy if exists "Organisations can delete their own grants" on grants;
create policy "Organisations can delete their own grants"
  on grants
  for delete
  using (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );
