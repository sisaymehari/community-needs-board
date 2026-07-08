import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const { user_id, name, email } = await request.json()

  if (!user_id || !name || !email) {
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

  // Verify the user exists in auth.users before creating the row
  const { data: { user }, error: userError } = await admin.auth.admin.getUserById(user_id)
  if (userError || !user) {
    return Response.json({ error: 'Invalid user' }, { status: 400 })
  }

  const { error: insertError } = await admin
    .from('volunteers')
    .insert({ id: user_id, name, email })

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
