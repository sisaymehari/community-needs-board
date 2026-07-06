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

  if (!org) {
    return (
      <main style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <a href="/" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
          ← Back to board
        </a>
        <p style={{ marginTop: '3rem', color: '#6b7280', fontSize: '15px' }}>
          Organisation not found.
        </p>
      </main>
    )
  }

  const organisation = org as Organisation

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem', background: '#fff', minHeight: '100vh' }}>
      <a href="/" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
        ← Back to board
      </a>

      <div style={{
        marginTop: '1.5rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        borderLeft: '4px solid #1D6A48',
        background: '#fff',
      }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '700', margin: '0 0 0.5rem' }}>
          {organisation.name}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '14px', color: '#6b7280' }}>
          <span>{organisation.location}</span>
          <a
            href={`mailto:${organisation.email}`}
            style={{ color: '#1D6A48', textDecoration: 'none' }}
          >
            {organisation.email}
          </a>
        </div>
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
        Open Needs
      </h2>

      {(needs ?? []).length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No open needs at the moment.
        </p>
      ) : (
        <NeedsBoard initialNeeds={(needs ?? []) as Need[]} />
      )}
    </main>
  )
}
