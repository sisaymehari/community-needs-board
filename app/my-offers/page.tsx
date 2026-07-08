'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORY_ICONS: Record<string, string> = {
  volunteers: '🙋',
  food: '🍎',
  clothing: '👕',
  equipment: '🔧',
  skills: '💡',
}

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
}

type OfferRow = {
  id: string
  message: string | null
  created_at: string
  needs: {
    description: string
    category: string
    organisation_id: string
    organisations: { name: string } | null
  } | null
}

export default function MyOffersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<OfferRow[]>([])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?message=Please+log+in+to+view+your+offers.')
        return
      }

      // Confirm this user is a volunteer (not an org owner)
      const { data: volData } = await supabase
        .from('volunteers')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!volData) {
        // Logged in but not a volunteer — redirect home
        router.replace('/')
        return
      }

      const { data } = await supabase
        .from('offers')
        .select('id, message, created_at, needs(description, category, organisation_id, organisations(name))')
        .eq('volunteer_id', session.user.id)
        .order('created_at', { ascending: false })

      setOffers((data as unknown as OfferRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) return null

  return (
    <main className="page-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <a href="/" style={{
        fontSize: '13px',
        color: 'var(--color-sage)',
        textDecoration: 'none',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        ← Back to board
      </a>

      <h1 style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: 'clamp(1.6rem, 3.5vw, 2rem)',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'var(--color-ink)',
        margin: '1.5rem 0 0.35rem',
      }}>
        My Offers
      </h1>
      <p style={{
        color: 'var(--color-sage)',
        fontSize: '14px',
        marginBottom: '2.5rem',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        Everything you&apos;ve offered to help with.
      </p>

      {offers.length === 0 ? (
        <div style={{
          padding: '2.5rem 1.5rem',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          background: '#fff',
          textAlign: 'center',
        }}>
          <p style={{
            color: 'var(--color-ink)',
            fontSize: '15px',
            fontWeight: '500',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            You haven&apos;t offered to help with anything yet.
          </p>
          <p style={{
            color: 'var(--color-sage)',
            fontSize: '14px',
            marginBottom: '1.25rem',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            Browse the board and make a difference for a local charity.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--color-green)',
              color: '#fff',
              padding: '0.6rem 1.25rem',
              borderRadius: '7px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            Browse needs
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '8px' }}>
          {offers.map(offer => {
            const need = offer.needs
            const category = need?.category ?? 'unknown'
            return (
              <div key={offer.id} style={{
                position: 'relative',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                padding: '1.4rem 1.5rem 1.25rem',
                background: '#fff',
              }}>
                {/* Pin — always green (these are the volunteer's own submissions) */}
                <span aria-hidden="true" style={{
                  position: 'absolute',
                  top: '-5px',
                  left: '20px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--color-green)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.18), 0 0 0 2px var(--color-bg)',
                  display: 'block',
                }} />

                {/* Header: category + date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
                      {CATEGORY_ICONS[category] || '📌'}
                    </span>
                    <span style={{
                      ...monoSm,
                      background: 'var(--color-green-light)',
                      color: 'var(--color-green)',
                      padding: '2px 9px',
                      borderRadius: '100px',
                      textTransform: 'capitalize',
                    }}>
                      {category}
                    </span>
                  </div>
                  <span style={{ ...monoSm, color: 'var(--color-sage)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {new Date(offer.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>

                {/* Need description */}
                {need?.description && (
                  <p style={{
                    fontSize: '15px',
                    color: 'var(--color-ink)',
                    lineHeight: '1.65',
                    marginBottom: '0.75rem',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}>
                    {need.description}
                  </p>
                )}

                {/* Organisation */}
                {need?.organisations?.name && (
                  <div style={{ fontSize: '13px', marginBottom: offer.message ? '0.75rem' : 0 }}>
                    <a
                      href={`/org/${need.organisation_id}`}
                      style={{ color: 'var(--color-green)', textDecoration: 'none', fontWeight: '500' }}
                    >
                      {need.organisations.name}
                    </a>
                  </div>
                )}

                {/* Volunteer's own message */}
                {offer.message && (
                  <div style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: '13.5px',
                    color: 'var(--color-sage)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    lineHeight: '1.6',
                  }}>
                    <span style={{ ...monoSm, color: 'var(--color-sage)', marginRight: '6px' }}>
                      Your message:
                    </span>
                    {offer.message}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
