import { supabase } from '@/lib/supabase'
import type { Need } from '@/lib/types'
import NeedsBoard from '@/app/components/NeedsBoard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { data: needs } = await supabase
    .from('needs')
    .select('*, organisations(name, location)')
    .eq('is_fulfilled', false)
    .order('created_at', { ascending: false })

  return (
    <main className="page-wrap" style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Community Needs Board
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', lineHeight: '1.7', marginBottom: '0.4rem' }}>
          Local charities and community organisations post what they need — volunteers, food, equipment, skills — and anyone can see it and offer to help directly.
          No middlemen, no sign-up required.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
          Free and open source. Built for Enfield, open to anyone.
        </p>
        <a
          href="/post"
          className="hero-cta"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            background: '#1D6A48',
            color: '#fff',
            padding: '0.6rem 1.2rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Post a Need
        </a>
      </div>

      <NeedsBoard initialNeeds={(needs ?? []) as Need[]} />
    </main>
  )
}