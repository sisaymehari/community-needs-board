'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EventWithCount } from '@/app/events/page'

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date} · ${time}`
}

export default function EventsBoard({ initialEvents }: { initialEvents: EventWithCount[] }) {
  const [events, setEvents] = useState(initialEvents)
  const [volunteer, setVolunteer] = useState<{ id: string; name: string } | null>(null)
  const [isNonVolunteer, setIsNonVolunteer] = useState(false)
  const [signedUpIds, setSignedUpIds] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Check auth on mount to immediately reflect signed-up state for returning volunteers
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: vol } = await supabase
        .from('volunteers')
        .select('id, name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!vol) {
        setIsNonVolunteer(true) // logged in, but not a volunteer
        return
      }

      setVolunteer({ id: session.user.id, name: vol.name })

      // Load existing signups so we can mark events as already joined
      const { data: sups } = await supabase
        .from('event_signups')
        .select('event_id')
        .eq('volunteer_id', session.user.id)
      if (sups) setSignedUpIds(new Set(sups.map(s => s.event_id)))
    }
    checkAuth()
  }, [])

  const handleSignup = async (eventId: string) => {
    if (!volunteer) {
      if (isNonVolunteer) {
        // Org or other non-volunteer account — show inline message handled below
        setErrors(prev => ({
          ...prev,
          [eventId]: 'Only volunteer accounts can sign up for events.',
        }))
        return
      }
      // Not logged in
      window.location.href =
        '/login?message=Please+log+in+as+a+volunteer+to+sign+up+for+events.'
      return
    }

    setPendingId(eventId)
    setErrors(prev => ({ ...prev, [eventId]: '' }))

    const { error } = await supabase
      .from('event_signups')
      .insert({ event_id: eventId, volunteer_id: volunteer.id })

    if (error) {
      setErrors(prev => ({
        ...prev,
        [eventId]: 'Could not sign up — please try again.',
      }))
    } else {
      setSignedUpIds(prev => new Set([...prev, eventId]))
      setEvents(prev =>
        prev.map(e =>
          e.id === eventId ? { ...e, signup_count: e.signup_count + 1 } : e
        )
      )
    }
    setPendingId(null)
  }

  if (events.length === 0) {
    return (
      <div style={{
        padding: '3rem 1.5rem',
        border: '1px dashed var(--color-border)',
        borderRadius: '10px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.75rem', lineHeight: 1 }}>📅</p>
        <p style={{
          fontSize: '15px',
          fontWeight: '600',
          color: 'var(--color-ink)',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        }}>
          No upcoming events
        </p>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-sage)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          maxWidth: '340px',
          margin: '0 auto',
        }}>
          Check back soon — organisations will post events here when they need volunteers.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '8px' }}>
      {events.map(event => {
        const isFull = event.max_volunteers != null && event.signup_count >= event.max_volunteers
        const spotsLeft = event.max_volunteers != null
          ? event.max_volunteers - event.signup_count
          : null
        const isSignedUp = signedUpIds.has(event.id)
        const isPending = pendingId === event.id
        const err = errors[event.id]

        return (
          <div key={event.id} style={{
            position: 'relative',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '1.4rem 1.5rem 1.25rem',
            background: '#fff',
          }}>
            {/* Pin — green for all events (upcoming = positive) */}
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

            {/* Header: date + spots */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.6rem',
            }}>
              <span style={{ ...monoSm, color: 'var(--color-sage)' }}>
                {formatEventDate(event.event_date)}
              </span>
              {event.max_volunteers != null && (
                <span style={{
                  ...monoSm,
                  background: isFull ? 'var(--color-marigold-bg)' : 'var(--color-green-light)',
                  color: isFull ? 'var(--color-marigold)' : 'var(--color-green)',
                  padding: '2px 9px',
                  borderRadius: '100px',
                  marginLeft: '8px',
                  whiteSpace: 'nowrap',
                }}>
                  {isFull ? 'Fully booked' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
              fontSize: '1.05rem',
              fontWeight: '700',
              letterSpacing: '-0.01em',
              color: 'var(--color-ink)',
              margin: '0 0 0.3rem',
            }}>
              {event.title}
            </h2>

            {/* Org name */}
            {event.organisations?.name && (
              <a
                href={`/org/${event.organisation_id}`}
                style={{
                  fontSize: '13px',
                  color: 'var(--color-green)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  display: 'block',
                  marginBottom: event.description || event.location ? '0.65rem' : '0.9rem',
                }}
              >
                {event.organisations.name}
              </a>
            )}

            {/* Description */}
            {event.description && (
              <p style={{
                fontSize: '14.5px',
                color: 'var(--color-ink)',
                lineHeight: '1.65',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                marginBottom: '0.65rem',
              }}>
                {event.description}
              </p>
            )}

            {/* Location */}
            {event.location && (
              <p style={{
                fontSize: '13px',
                color: 'var(--color-sage)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                marginBottom: '0.9rem',
              }}>
                📍 {event.location}
              </p>
            )}

            {/* Sign up */}
            {isSignedUp ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '13px',
                color: 'var(--color-green)',
                fontWeight: '600',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}>
                ✓ Signed up
              </span>
            ) : (
              <button
                onClick={() => handleSignup(event.id)}
                disabled={isPending || isFull}
                className="card-action-btn"
                style={{
                  cursor: isPending || isFull ? 'not-allowed' : undefined,
                  opacity: isFull ? 0.6 : 1,
                }}
              >
                {isPending && <span className="spinner-grey" style={{ marginRight: '5px' }} />}
                {isPending ? 'Signing up…' : isFull ? 'Fully booked' : 'Sign up'}
              </button>
            )}

            {err && (
              <p role="alert" style={{
                fontSize: '12px',
                color: 'var(--color-error)',
                marginTop: '0.4rem',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}>
                {err}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
