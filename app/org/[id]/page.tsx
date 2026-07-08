import { supabase } from '@/lib/supabase'
import type { Need, Organisation } from '@/lib/types'
import NeedsBoard from '@/app/components/NeedsBoard'

export default async function OrgPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: org }, { data: needs }] = await Promise.all([
    supabase
      .from('organisations')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('needs')
      .select('*, organisations(name, location)')
      .eq('organisation_id', id)
      .eq('is_fulfilled', false)
      .order('created_at', { ascending: false }),
  ])

  const backLink = (
    <a href="/" style={{
      fontSize: '13px',
      color: 'var(--color-sage)',
      textDecoration: 'none',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      ← Back to board
    </a>
  )

  if (!org) {
    return (
      <main className="page-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {backLink}
        <p style={{ marginTop: '3rem', color: 'var(--color-sage)', fontSize: '15px', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          Organisation not found.
        </p>
      </main>
    )
  }

  const organisation = org as Organisation

  return (
    <main className="page-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {backLink}

      <div style={{
        marginTop: '1.5rem',
        marginBottom: '2.5rem',
        padding: '1.5rem',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        borderLeft: '4px solid var(--color-green)',
        background: '#fff',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
          fontSize: '1.5rem',
          fontWeight: '700',
          letterSpacing: '-0.015em',
          color: 'var(--color-ink)',
          margin: '0 0 0.6rem',
        }}>
          {organisation.name}
        </h1>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '13px',
          color: 'var(--color-sage)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          <span>{organisation.location}</span>
          <a
            href={`mailto:${organisation.email}`}
            style={{ color: 'var(--color-green)', textDecoration: 'none' }}
          >
            {organisation.email}
          </a>
        </div>
      </div>

      <h2 style={{
        fontFamily: 'var(--font-ibm-plex-mono), monospace',
        fontSize: '11.5px',
        fontWeight: '500',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--color-sage)',
        marginBottom: '1.25rem',
      }}>
        Open Needs
      </h2>

      {(needs ?? []).length === 0 ? (
        <p style={{ color: 'var(--color-sage)', fontSize: '14px', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          No open needs at the moment.
        </p>
      ) : (
        <NeedsBoard initialNeeds={(needs ?? []) as Need[]} />
      )}
    </main>
  )
}
