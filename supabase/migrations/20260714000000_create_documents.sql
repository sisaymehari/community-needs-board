-- Document storage for organisations (DBS checks, insurance certificates,
-- policies, etc.)
--
-- This migration assumes the 'org-documents' Storage bucket has already been
-- created as PRIVATE (public = false) — see the setup instructions given
-- alongside this migration. Files are stored at the path
-- `${organisation_id}/${filename}`, so the storage policies below scope
-- access to the owning organisation's folder.

-- ── Documents metadata table ──────────────────────────────────────────────

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists documents_organisation_id_idx
  on documents (organisation_id);

-- RLS: same private ownership pattern as donations, inventory, and grants —
-- only the owning organisation (organisations.owner_id = auth.uid()) may
-- touch its rows.
alter table documents enable row level security;

drop policy if exists "Organisations can view their own documents" on documents;
create policy "Organisations can view their own documents"
  on documents
  for select
  using (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Organisations can insert their own documents" on documents;
create policy "Organisations can insert their own documents"
  on documents
  for insert
  with check (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Organisations can delete their own documents" on documents;
create policy "Organisations can delete their own documents"
  on documents
  for delete
  using (
    organisation_id in (
      select id from organisations where owner_id = auth.uid()
    )
  );

-- ── Storage policies for the 'org-documents' bucket ───────────────────────
--
-- These policies live on storage.objects and are scoped by bucket_id, so
-- they only take effect once the 'org-documents' bucket itself exists.
-- Create the bucket in the Supabase dashboard FIRST (Storage > New bucket,
-- public OFF), then run this migration.
--
-- (storage.foldername(name))[1] is the first path segment of the object's
-- key — since every upload is written to `${organisation_id}/${filename}`,
-- that segment is the organisation's id.

drop policy if exists "Org can read own document files" on storage.objects;
create policy "Org can read own document files"
  on storage.objects
  for select
  using (
    bucket_id = 'org-documents'
    and (storage.foldername(name))[1] = (
      select id::text from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Org can upload own document files" on storage.objects;
create policy "Org can upload own document files"
  on storage.objects
  for insert
  with check (
    bucket_id = 'org-documents'
    and (storage.foldername(name))[1] = (
      select id::text from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Org can update own document files" on storage.objects;
create policy "Org can update own document files"
  on storage.objects
  for update
  using (
    bucket_id = 'org-documents'
    and (storage.foldername(name))[1] = (
      select id::text from organisations where owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'org-documents'
    and (storage.foldername(name))[1] = (
      select id::text from organisations where owner_id = auth.uid()
    )
  );

drop policy if exists "Org can delete own document files" on storage.objects;
create policy "Org can delete own document files"
  on storage.objects
  for delete
  using (
    bucket_id = 'org-documents'
    and (storage.foldername(name))[1] = (
      select id::text from organisations where owner_id = auth.uid()
    )
  );
