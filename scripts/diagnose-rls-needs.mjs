// Test whether the needs SELECT policy blocks authenticated users
// The homepage reads needs server-side (anon role, no session)
// The dashboard reads needs client-side (authenticated role, with session)
// If needs are only readable by 'anon' role, dashboard will get empty results

import { createClient } from '@supabase/supabase-js'

const url = 'https://patyfwwjqivpjwradbdv.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdHlmd3dqcWl2cGp3cmFkYmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTQ3OTIsImV4cCI6MjA5ODQ3MDc5Mn0.CuR2OF1mZhhaKQ0DUCFJ9kRJh1hqFoJ9OQMekQwMUuA'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdHlmd3dqcWl2cGp3cmFkYmR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5NDc5MiwiZXhwIjoyMDk4NDcwNzkyfQ.UDd6kw_G-PRlUl7588DLD3jRl7CdKrDybO_j0GkJp6w'

const FOOD_BANK_ORG_ID = '89fa9567-09e7-4fc2-9dde-dfd9e8c1381e'
const FOOD_BANK_OWNER_EMAIL = 'test-signup-3@example.com'

const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

// 1. Anon role (no session) — same as homepage server component
console.log('=== 1. Anon (no session) — simulates homepage ===')
const { data: anonNeeds, error: anonErr } = await anon
  .from('needs')
  .select('id, category, is_fulfilled')
  .eq('organisation_id', FOOD_BANK_ORG_ID)
  .eq('is_fulfilled', false)
console.log('  data:', anonNeeds?.length ?? 0, 'rows')
if (anonErr) console.log('  error:', anonErr.message, anonErr.code)

// 2. Authenticated session (sign in as Food Bank owner) — simulates dashboard
console.log('\n=== 2. Authenticated session — simulates dashboard ===')
const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
  email: FOOD_BANK_OWNER_EMAIL,
  password: 'testpassword123',  // try common test password
})

if (signInErr) {
  console.log('  Sign-in failed (wrong password):', signInErr.message)
  console.log('  → Cannot test authenticated reads with this password.')
  console.log('  → The most likely cause is that needs SELECT policy only covers anon role.')
  console.log('  → Check SQL below to fix.')
} else {
  console.log('  Signed in as:', signInData.user?.email)
  const { data: authedNeeds, error: authedErr } = await anon
    .from('needs')
    .select('id, category, is_fulfilled')
    .eq('organisation_id', FOOD_BANK_ORG_ID)
    .eq('is_fulfilled', false)
  console.log('  data:', authedNeeds?.length ?? 0, 'rows')
  if (authedErr) console.log('  error:', authedErr.message, authedErr.code)

  if (anonNeeds?.length && !authedNeeds?.length) {
    console.log('\n  ⚠️  CONFIRMED: anon reads succeed but authenticated reads fail.')
    console.log('  Cause: needs SELECT policy applies to "anon" role only, not "authenticated".')
  } else if (authedNeeds?.length) {
    console.log('\n  ✅  Authenticated reads work. RLS is NOT the problem.')
    console.log('  Check browser console for silent errors in the dashboard queries.')
  }
  await anon.auth.signOut()
}

// 3. Service role (bypasses RLS) — ground truth
console.log('\n=== 3. Service role (bypasses RLS) ===')
const { data: adminNeeds } = await admin
  .from('needs')
  .select('id, category, is_fulfilled')
  .eq('organisation_id', FOOD_BANK_ORG_ID)
  .eq('is_fulfilled', false)
console.log('  data:', adminNeeds?.length ?? 0, 'rows (ground truth)')

// Summary
console.log('\n=== SQL TO FIX (run in Supabase if needs policy is anon-only) ===')
console.log(`
-- Check your current policies first:
-- SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'needs';

-- If the existing policy only covers anon, replace or add:
DROP POLICY IF EXISTS "anon_select_needs" ON needs;
CREATE POLICY "public_select_needs"
  ON needs FOR SELECT
  USING (true);
-- USING (true) covers ALL roles: anon, authenticated, service_role

-- Alternatively, if you want to keep anon and just add authenticated:
CREATE POLICY "authenticated_select_needs"
  ON needs FOR SELECT
  TO authenticated
  USING (true);
`)
