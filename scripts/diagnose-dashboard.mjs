import { createClient } from '@supabase/supabase-js'

const url = 'https://patyfwwjqivpjwradbdv.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdHlmd3dqcWl2cGp3cmFkYmR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5NDc5MiwiZXhwIjoyMDk4NDcwNzkyfQ.UDd6kw_G-PRlUl7588DLD3jRl7CdKrDybO_j0GkJp6w'

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log('=== ALL ORGANISATIONS ===')
const { data: orgs } = await admin
  .from('organisations')
  .select('id, name, owner_id, created_at')
  .order('created_at', { ascending: true })
console.table(orgs)

console.log('\n=== AUTH USERS (to match owner_id → email) ===')
const { data: { users } } = await admin.auth.admin.listUsers()
const userMap = Object.fromEntries(users.map(u => [u.id, u.email]))
for (const org of orgs ?? []) {
  console.log(`  org "${org.name}" (${org.id.slice(0,8)}…) → owner_id ${org.owner_id?.slice(0,8)}… → ${userMap[org.owner_id] ?? 'unknown user'}`)
}

console.log('\n=== ALL NEEDS (organisation_id → org name) ===')
const { data: needs } = await admin
  .from('needs')
  .select('id, organisation_id, category, is_fulfilled, created_at')
  .order('created_at', { ascending: true })

const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, o.name]))
for (const n of needs ?? []) {
  const orgName = orgMap[n.organisation_id] ?? '⚠️  NO MATCHING ORG'
  console.log(`  need ${n.id.slice(0,8)}… → org_id ${n.organisation_id.slice(0,8)}… (${orgName}) | ${n.category} | fulfilled=${n.is_fulfilled}`)
}

console.log('\n=== ALL DONATIONS ===')
const { data: donations } = await admin
  .from('donations')
  .select('id, organisation_id, type, amount, created_at')
  .order('created_at', { ascending: true })
for (const d of donations ?? []) {
  const orgName = orgMap[d.organisation_id] ?? '⚠️  NO MATCHING ORG'
  console.log(`  donation ${d.id.slice(0,8)}… → org_id ${d.organisation_id.slice(0,8)}… (${orgName}) | ${d.type} | amount=${d.amount}`)
}

console.log('\n=== ALL OFFERS ===')
const { data: offers } = await admin
  .from('offers')
  .select('id, need_id, name, created_at')
  .order('created_at', { ascending: true })

// Build need → org mapping
const needOrgMap = Object.fromEntries((needs ?? []).map(n => [n.id, n.organisation_id]))
for (const o of offers ?? []) {
  const orgId = needOrgMap[o.need_id]
  const orgName = orgId ? (orgMap[orgId] ?? '⚠️  NO MATCHING ORG') : '⚠️  NEED NOT FOUND'
  console.log(`  offer ${o.id.slice(0,8)}… → need ${o.need_id.slice(0,8)}… → org (${orgName}) | from "${o.name}"`)
}

console.log('\n=== DIAGNOSIS ===')
// For each org, count their actual needs/donations/offers
for (const org of orgs ?? []) {
  const orgNeeds = (needs ?? []).filter(n => n.organisation_id === org.id)
  const openCount = orgNeeds.filter(n => !n.is_fulfilled).length
  const fulfilledCount = orgNeeds.filter(n => n.is_fulfilled).length
  const orgDonations = (donations ?? []).filter(d => d.organisation_id === org.id)
  const orgOffers = (offers ?? []).filter(o => orgNeeds.some(n => n.id === o.need_id))

  console.log(`\n  "${org.name}" (${org.id.slice(0,8)}…) owned by ${userMap[org.owner_id] ?? org.owner_id?.slice(0,8) + '…'}`)
  console.log(`    Open needs: ${openCount}, Fulfilled: ${fulfilledCount}, Donations: ${orgDonations.length}, Offers: ${orgOffers.length}`)
}
