import { createClient } from '@supabase/supabase-js'
import EventsBoard from '@/app/components/EventsBoard'

export const dynamic = 'force-dynamic'

// Exported so EventsBoard can import the type
export type EventWithCount = {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  max_volunteers: number | null
  signup_count: number
  organisation_id: string
  organisations: { name: string } | null
}

// Signup counts come from the service role so we never expose who signed up —
// only the aggregate count reaches the browser.
export default async function EventsPage() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const now = new Date().toISOString()

  const [eventsRes, signupsRes] = await Promise.all([
    admin
      .from('events')
      .select('id, title, description, event_date, location, max_volunteers, organisation_id, organisations(name)')
      .gte('event_date', now)
      .order('event_date', { ascending: true }),
    admin
      .from('event_signups')
      .select('event_id'),
  ])

  // Count signups per event
  const countMap: Record<string, number> = {}
  signupsRes.data?.forEach(s => {
    countMap[s.event_id] = (countMap[s.event_id] ?? 0) + 1
  })

  const events = ((eventsRes.data ?? []) as unknown as EventWithCount[]).map(e => ({
    ...e,
    signup_count: countMap[e.id] ?? 0,
  }))

  return (
    <main className="page-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        paddingBottom: '2.5rem',
        marginBottom: '2.5rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
          fontSize: 'clamp(1.9rem, 4vw, 2.4rem)',
          fontWeight: '700',
          letterSpacing: '-0.02em',
          color: 'var(--color-ink)',
          margin: '0 0 0.75rem',
        }}>
          Upcoming Events
        </h1>
        <p style={{
          color: 'var(--color-sage)',
          fontSize: '15px',
          lineHeight: '1.7',
          maxWidth: '560px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          margin: 0,
        }}>
          Community events from local charities and organisations.
          Sign up as a volunteer to help out.
        </p>
      </div>

      <EventsBoard initialEvents={events} />
    </main>
  )
}
