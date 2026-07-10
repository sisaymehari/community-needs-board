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
    <main className="page-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        paddingBottom: '2.5rem',
        marginBottom: '2.5rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
          fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
          fontWeight: '700',
          lineHeight: '1.13',
          letterSpacing: '-0.02em',
          color: 'var(--color-ink)',
          margin: '0 0 0.9rem',
        }}>
          Community Needs Board
        </h1>
        <p style={{
          color: 'var(--color-sage)',
          fontSize: '1rem',
          lineHeight: '1.75',
          marginBottom: '0.4rem',
          maxWidth: '600px',
        }}>
          Local charities and community organisations post what they need — volunteers, food,
          equipment, skills — and anyone can see it and offer to help directly.
          No middlemen, no sign-up required.
        </p>
        <p style={{
          fontSize: '0.85rem',
          fontFamily: 'var(--font-ibm-plex-mono), monospace',
          marginBottom: '0.85rem',
          color: 'var(--color-sage)',
          opacity: 0.7,
        }}>
          Free and open source · Built for Enfield, open to anyone
        </p>
        <a
          href="/post"
          className="btn-primary hero-cta"
          style={{ width: 'auto', letterSpacing: '0.01em' }}
        >
          Post a Need
        </a>
      </div>

      <NeedsBoard initialNeeds={(needs ?? []) as Need[]} />
    </main>
  )
}
