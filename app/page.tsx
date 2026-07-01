import { supabase } from '@/lib/supabase'
import type { Need } from '@/lib/types'
import NeedsBoard from '@/app/components/NeedsBoard'

export default async function HomePage() {
  const { data: needs } = await supabase
    .from('needs')
    .select('*, organisations(name, location)')
    .eq('is_fulfilled', false)
    .order('created_at', { ascending: false })

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Community Needs Board
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          Local charities posting what they need. Browse and offer to help.
        </p>
        <a
          href="/post"
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