-- Fix: /matches could not embed businesses(name) into business_offers queries.
--
-- business_offers.business_id was declared as `references auth.users(id)`,
-- which is logically correct (a business's row ID is its auth user ID) but
-- gives PostgREST no direct foreign-key path from business_offers to
-- businesses — so `.select('..., businesses(name)')` failed with PGRST200
-- ("Could not find a relationship between 'business_offers' and
-- 'businesses' in the schema cache"), and the matches page silently treated
-- the failed query as an empty result.
--
-- Adding this FK gives PostgREST a direct relationship to resolve, without
-- removing the existing auth.users FK (both are satisfiable simultaneously,
-- since businesses.id is itself constrained to auth.users.id).

alter table business_offers
  add constraint business_offers_business_id_businesses_fkey
  foreign key (business_id) references businesses(id) on delete cascade;
