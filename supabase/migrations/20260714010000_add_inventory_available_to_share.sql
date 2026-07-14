-- Charity-to-charity resource matching: lets an organisation mark specific
-- inventory items as available to share with other charities.

alter table inventory_items
  add column if not exists available_to_share boolean not null default false;
