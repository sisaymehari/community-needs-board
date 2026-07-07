const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orgEmail, orgName, needDescription, helperName, helperEmail, helperMessage } =
      await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') ?? 'onboarding@resend.dev'

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject = `New offer to help — ${needDescription.slice(0, 60)}${needDescription.length > 60 ? '...' : ''}`

    const html = `
      <div style="font-family:sans-serif;max-width:600px;color:#111827">
        <p>Hi ${orgName},</p>
        <p>Someone has offered to help with one of your needs on the
          <strong>Community Needs Board</strong>.</p>

        <div style="border-left:4px solid #1D6A48;padding:0.75rem 1rem;
                    background:#f9fafb;margin:1.5rem 0;border-radius:4px">
          <p style="margin:0;font-size:15px;color:#374151">${needDescription}</p>
        </div>

        <table style="font-size:14px;border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:6px 0;color:#6b7280;width:80px">From</td>
            <td style="padding:6px 0;font-weight:500">${helperName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Email</td>
            <td style="padding:6px 0">
              <a href="mailto:${helperEmail}" style="color:#1D6A48">${helperEmail}</a>
            </td>
          </tr>
          ${helperMessage ? `
          <tr>
            <td style="padding:6px 0;color:#6b7280;vertical-align:top">Message</td>
            <td style="padding:6px 0">${helperMessage}</td>
          </tr>` : ''}
        </table>

        <p style="margin-top:1.5rem">
          Reply directly to
          <a href="mailto:${helperEmail}" style="color:#1D6A48">${helperEmail}</a>
          to get in touch with them.
        </p>

        <p style="color:#9ca3af;font-size:13px;margin-top:2rem;border-top:1px solid #e5e7eb;padding-top:1rem">
          — Community Needs Board<br>
          <a href="https://community-needs-board.netlify.app" style="color:#9ca3af">
            community-needs-board.netlify.app
          </a>
        </p>
      </div>
    `

    const text = [
      `Hi ${orgName},`,
      '',
      `Someone has offered to help with one of your needs on the Community Needs Board.`,
      '',
      `Need: ${needDescription}`,
      '',
      `From: ${helperName}`,
      `Email: ${helperEmail}`,
      helperMessage ? `Message: ${helperMessage}` : null,
      '',
      `Reply directly to ${helperEmail} to get in touch.`,
      '',
      '— Community Needs Board',
    ].filter((line) => line !== null).join('\n')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Community Needs Board <${SENDER_EMAIL}>`,
        to: orgEmail,
        reply_to: helperEmail,
        subject,
        html,
        text,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
