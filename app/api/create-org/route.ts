import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const { user_id, name, location, email } = await request.json()

  if (!user_id || !name || !location || !email) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify the user actually exists in auth.users before creating the org
  const { data: { user }, error: userError } = await admin.auth.admin.getUserById(user_id)
  if (userError || !user) {
    return Response.json({ error: 'Invalid user' }, { status: 400 })
  }

  const { error: orgError } = await admin
    .from('organisations')
    .insert({ name, location, email, owner_id: user_id })

  if (orgError) {
    return Response.json({ error: orgError.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
