import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const { user_id, need_id } = await request.json()

  if (!user_id || !need_id) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!serviceRoleKey || !anthropicApiKey) {
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify the user actually exists in auth.users
  const { data: { user }, error: userError } = await admin.auth.admin.getUserById(user_id)
  if (userError || !user) {
    return Response.json({ error: 'Invalid user' }, { status: 401 })
  }

  // Fetch the need this post is being generated for
  const { data: need, error: needError } = await admin
    .from('needs')
    .select('id, description, category, is_urgent, organisation_id')
    .eq('id', need_id)
    .maybeSingle()

  if (needError || !need) {
    return Response.json({ error: 'Need not found' }, { status: 404 })
  }

  // Verify this user owns the organisation that posted the need
  const { data: org, error: orgError } = await admin
    .from('organisations')
    .select('id, name, owner_id')
    .eq('id', need.organisation_id)
    .maybeSingle()

  if (orgError || !org || org.owner_id !== user_id) {
    return Response.json({ error: 'Not authorized for this need' }, { status: 403 })
  }

  const needSummary = `
- Organisation: ${org.name}
- Category: ${need.category}
- Urgent: ${need.is_urgent ? 'yes' : 'no'}
- Description: ${need.description}
`.trim()

  try {
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      system:
        'You write short, warm, shareable social media posts for small community organisations, ' +
        "encouraging people to help with a specific need. Suitable for platforms like Twitter/X or " +
        'Facebook. The post must be under 280 characters, plain text (no markdown, no headings), and ' +
        'may include a couple of relevant hashtags if they fit within the limit. Grounded entirely in ' +
        'the details provided — do not invent facts. Return only the post text, nothing else.',
      messages: [
        {
          role: 'user',
          content: `Write a social media post encouraging people to help with this need:\n\n${needSummary}`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    const post = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : ''

    if (!post) {
      return Response.json({ error: 'The AI did not return a post. Please try again.' }, { status: 502 })
    }

    return Response.json({ post })
  } catch {
    return Response.json(
      { error: 'Could not generate the post right now. Please try again in a moment.' },
      { status: 502 }
    )
  }
}
