/**
 * RLS proof-of-concept: can user B update a need owned by user A?
 * Creates isolated test users + data, tests, then cleans up.
 * Run with: node scripts/test-rls-needs-update.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env.local without requiring dotenv
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const URL  = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC  = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SVC) {
  console.error('Missing env vars — check .env.local')
  process.exit(1)
}

const admin  = createClient(URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } })
const clientB = createClient(URL, ANON)

const TS = Date.now()
const emailA = `rls-test-a-${TS}@example.com`
const emailB = `rls-test-b-${TS}@example.com`
const password = 'testpass-rls-123'

let userAId, userBId, orgAId, needId

try {
  // ── 1. Create two fresh users ────────────────────────────────────────────
  console.log('\n[1] Creating test users…')
  const { data: { user: uA }, error: eA } = await admin.auth.admin.createUser(
    { email: emailA, password, email_confirm: true }
  )
  const { data: { user: uB }, error: eB } = await admin.auth.admin.createUser(
    { email: emailB, password, email_confirm: true }
  )
  if (eA || eB || !uA || !uB) throw new Error(`User creation failed: ${eA?.message ?? eB?.message}`)
  userAId = uA.id
  userBId = uB.id
  console.log('  User A (owner) :', userAId)
  console.log('  User B (attacker):', userBId)

  // ── 2. Create org + need for user A (via service role to bypass RLS) ─────
  console.log('\n[2] Creating org and need for user A…')
  const { data: org, error: eOrg } = await admin
    .from('organisations')
    .insert({ name: 'RLS Test Org A', location: 'London', email: emailA, owner_id: userAId })
    .select('id')
    .single()
  if (eOrg) throw new Error(`Org insert failed: ${eOrg.message}`)
  orgAId = org.id

  const { data: need, error: eNeed } = await admin
    .from('needs')
    .insert({ organisation_id: orgAId, category: 'volunteers', description: 'RLS test — do not fulfil', is_urgent: false })
    .select('id')
    .single()
  if (eNeed) throw new Error(`Need insert failed: ${eNeed.message}`)
  needId = need.id
  console.log('  Org ID :', orgAId)
  console.log('  Need ID:', needId)

  // ── 3. Sign in as user B ─────────────────────────────────────────────────
  console.log('\n[3] Signing in as user B (non-owner)…')
  const { error: eLogin } = await clientB.auth.signInWithPassword({ email: emailB, password })
  if (eLogin) throw new Error(`Login failed: ${eLogin.message}`)
  const { data: { session } } = await clientB.auth.getSession()
  console.log('  Signed in as:', session?.user?.id)

  // ── 4. Attempt to update user A's need as user B ─────────────────────────
  console.log('\n[4] User B attempts UPDATE on user A\'s need…')
  const { data: updated, error: eUpdate } = await clientB
    .from('needs')
    .update({ is_fulfilled: true })
    .eq('id', needId)
    .select('id')

  console.log('  data  :', JSON.stringify(updated))
  console.log('  error :', eUpdate ? JSON.stringify(eUpdate) : null)

  // ── 5. Verify DB is unchanged (service role sees the truth) ──────────────
  console.log('\n[5] Verifying actual DB state via service role…')
  const { data: row } = await admin.from('needs').select('is_fulfilled').eq('id', needId).single()
  console.log('  is_fulfilled in DB:', row?.is_fulfilled)

  // ── 6. Verdict ───────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════')
  const rowsAffected = updated?.length ?? 0
  const dbUnchanged  = row?.is_fulfilled === false
  if (rowsAffected === 0 && dbUnchanged) {
    console.log('✅  RLS WORKING — update returned 0 rows, DB row unchanged')
  } else if (rowsAffected > 0 || !dbUnchanged) {
    console.log('❌  RLS BROKEN  — non-owner was able to modify a need they don\'t own')
  }
  console.log('══════════════════════════════════════════\n')

} finally {
  // ── 7. Cleanup ───────────────────────────────────────────────────────────
  console.log('[cleanup] Removing test data…')
  if (needId)  await admin.from('needs').delete().eq('id', needId)
  if (orgAId)  await admin.from('organisations').delete().eq('id', orgAId)
  if (userAId) await admin.auth.admin.deleteUser(userAId)
  if (userBId) await admin.auth.admin.deleteUser(userBId)
  console.log('[cleanup] Done.')
}
