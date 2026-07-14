import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

function formatCurrency(n: number) {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

export async function POST(request: Request) {
  const { user_id, organisation_id } = await request.json()

  if (!user_id || !organisation_id) {
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

  // Verify this user owns the organisation the report is being generated for
  const { data: org, error: orgError } = await admin
    .from('organisations')
    .select('id, name, owner_id')
    .eq('id', organisation_id)
    .maybeSingle()

  if (orgError || !org || org.owner_id !== user_id) {
    return Response.json({ error: 'Not authorized for this organisation' }, { status: 403 })
  }

  // Gather real organisation data
  const [
    totalNeedsRes,
    fulfilledNeedsRes,
    moneyRes,
    goodsCountRes,
    eventsRes,
    grantsRes,
    needIdsRes,
  ] = await Promise.all([
    admin.from('needs').select('id', { count: 'exact', head: true }).eq('organisation_id', org.id),
    admin.from('needs').select('id', { count: 'exact', head: true }).eq('organisation_id', org.id).eq('is_fulfilled', true),
    admin.from('donations').select('amount').eq('organisation_id', org.id).eq('type', 'money'),
    admin.from('donations').select('id', { count: 'exact', head: true }).eq('organisation_id', org.id).eq('type', 'goods'),
    admin.from('events').select('id').eq('organisation_id', org.id),
    admin.from('grants').select('status').eq('organisation_id', org.id),
    admin.from('needs').select('id').eq('organisation_id', org.id),
  ])

  const totalNeeds = totalNeedsRes.count ?? 0
  const fulfilledNeeds = fulfilledNeedsRes.count ?? 0
  const totalMoney = (moneyRes.data ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0)
  const goodsDonationsCount = goodsCountRes.count ?? 0

  const eventIds = (eventsRes.data ?? []).map(e => e.id)
  const totalEvents = eventIds.length
  let totalSignups = 0
  if (eventIds.length > 0) {
    const { count } = await admin
      .from('event_signups')
      .select('id', { count: 'exact', head: true })
      .in('event_id', eventIds)
    totalSignups = count ?? 0
  }

  const grantStatusCounts = { planned: 0, submitted: 0, awarded: 0, rejected: 0 }
  for (const g of grantsRes.data ?? []) {
    if (g.status in grantStatusCounts) {
      grantStatusCounts[g.status as keyof typeof grantStatusCounts]++
    }
  }

  const needIds = (needIdsRes.data ?? []).map(n => n.id)
  let totalOffers = 0
  if (needIds.length > 0) {
    const { count } = await admin
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .in('need_id', needIds)
    totalOffers = count ?? 0
  }

  const dataSummary = `
- Needs posted: ${totalNeeds} (${fulfilledNeeds} fulfilled)
- Money raised from donations: ${formatCurrency(totalMoney)}
- Goods donations received: ${goodsDonationsCount}
- Events run: ${totalEvents} (${totalSignups} total volunteer signups)
- Grants: ${grantStatusCounts.planned} planned, ${grantStatusCounts.submitted} submitted, ${grantStatusCounts.awarded} awarded, ${grantStatusCounts.rejected} rejected
- Offers of help received: ${totalOffers}
`.trim()

  try {
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 700,
      system:
        'You write warm, professional impact summaries for small community organisations. ' +
        'Your audience is trustees and funders deciding whether to keep supporting this organisation. ' +
        'Write in plain prose (no headings, bullet points, or markdown), 200-300 words, grounded ' +
        'entirely in the data provided. Do not invent facts, names, or figures beyond what is given. ' +
        "If a figure is zero, either omit it gracefully or frame it honestly — don't inflate it.",
      messages: [
        {
          role: 'user',
          content:
            `Write an impact summary for "${org.name}" based on the following data:\n\n${dataSummary}`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    const report = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    if (!report) {
      return Response.json({ error: 'The AI did not return a report. Please try again.' }, { status: 502 })
    }

    return Response.json({ report })
  } catch {
    return Response.json(
      { error: 'Could not generate the report right now. Please try again in a moment.' },
      { status: 502 }
    )
  }
}
