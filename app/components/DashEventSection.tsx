'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DashEvent = {
  id: string
  title: string
  event_date: string
  location: string | null
  max_volunteers: number | null
  signup_count: number
}

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
}

const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11.5px',
  fontWeight: '500',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-sage)',
  margin: 0,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13.5px',
  fontWeight: '500',
  marginBottom: '0.4rem',
  color: 'var(--color-ink)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
}

const fieldErrorStyle: React.CSSProperties = {
  fontSize: '12.5px',
  color: 'var(--color-error)',
  margin: '0.3rem 0 0',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// Minimum datetime string for the datetime-local input (now, in local time)
function localNowMin() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export default function DashEventSection({ orgId }: { orgId: string }) {
  const [events, setEvents] = useState<DashEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    event_date: '',
    location: '',
    description: '',
    max_volunteers: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, event_date, location, max_volunteers')
        .eq('organisation_id', orgId)
        .order('event_date', { ascending: true })

      const ids = eventsData?.map(e => e.id) ?? []
      const countMap: Record<string, number> = {}

      if (ids.length > 0) {
        const { data: sups } = await supabase
          .from('event_signups')
          .select('event_id')
          .in('event_id', ids)
        sups?.forEach(s => {
          countMap[s.event_id] = (countMap[s.event_id] ?? 0) + 1
        })
      }

      setEvents(
        (eventsData ?? []).map(e => ({ ...e, signup_count: countMap[e.id] ?? 0 }))
      )
      setLoading(false)
    }

    load()
  }, [orgId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = 'Event title is required.'
    if (!form.event_date) {
      errors.event_date = 'Date and time are required.'
    } else if (new Date(form.event_date) <= new Date()) {
      errors.event_date = 'Event date must be in the future.'
    }
    if (form.max_volunteers) {
      const n = Number(form.max_volunteers)
      if (isNaN(n) || n < 1 || !Number.isInteger(n))
        errors.max_volunteers = 'Must be a whole number greater than 0.'
    }
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          organisation_id: orgId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          event_date: new Date(form.event_date).toISOString(),
          location: form.location.trim() || null,
          max_volunteers: form.max_volunteers ? Number(form.max_volunteers) : null,
        })
        .select('id, title, event_date, location, max_volunteers')
        .single()

      if (error) throw error

      setEvents(prev =>
        [...prev, { ...data, signup_count: 0 }].sort(
          (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        )
      )
      setForm({ title: '', event_date: '', location: '', description: '', max_volunteers: '' })
      setFieldErrors({})
      setShowForm(false)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={{
      marginTop: '3rem',
      paddingTop: '3rem',
      borderTop: '1px solid var(--color-border)',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
      }}>
        <h2 style={sectionHeading}>
          Events{events.length > 0 ? ` (${events.length})` : ''}
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href="/events" className="text-link" style={{
            fontSize: '13px',
            color: 'var(--color-sage)',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            Public board →
          </a>
          <button
            onClick={() => setShowForm(prev => !prev)}
            className="card-action-btn"
          >
            {showForm ? 'Cancel' : '+ New event'}
          </button>
        </div>
      </div>

      {/* Create event form */}
      {showForm && (
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
          background: '#fff',
          marginBottom: '1.25rem',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            fontSize: '1rem',
            fontWeight: '700',
            color: 'var(--color-ink)',
            margin: '0 0 1.1rem',
          }}>
            Create an event
          </h3>

          {submitError && (
            <div role="alert" style={{
              background: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              padding: '0.75rem 1rem',
              borderRadius: '7px',
              marginBottom: '1rem',
              fontSize: '14px',
              border: '1px solid var(--color-error-border)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div>
                <label htmlFor="ev-title" style={labelStyle}>Event title</label>
                <input
                  id="ev-title"
                  name="title"
                  className={`form-input${fieldErrors.title ? ' form-input--error' : ''}`}
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Volunteer Sorting Day"
                />
                {fieldErrors.title && <p role="alert" style={fieldErrorStyle}>{fieldErrors.title}</p>}
              </div>

              <div>
                <label htmlFor="ev-date" style={labelStyle}>Date &amp; time</label>
                <input
                  id="ev-date"
                  name="event_date"
                  type="datetime-local"
                  min={localNowMin()}
                  className={`form-input${fieldErrors.event_date ? ' form-input--error' : ''}`}
                  value={form.event_date}
                  onChange={handleChange}
                />
                {fieldErrors.event_date && <p role="alert" style={fieldErrorStyle}>{fieldErrors.event_date}</p>}
              </div>

              <div>
                <label htmlFor="ev-location" style={labelStyle}>
                  Location{' '}
                  <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="ev-location"
                  name="location"
                  className="form-input"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Enfield Food Bank warehouse"
                />
              </div>

              <div>
                <label htmlFor="ev-description" style={labelStyle}>
                  Description{' '}
                  <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  id="ev-description"
                  name="description"
                  className="form-input"
                  style={{ minHeight: '70px', resize: 'vertical' }}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="What will volunteers be doing?"
                />
              </div>

              <div>
                <label htmlFor="ev-max" style={labelStyle}>
                  Max volunteers{' '}
                  <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}>(optional — leave blank for unlimited)</span>
                </label>
                <input
                  id="ev-max"
                  name="max_volunteers"
                  type="number"
                  min="1"
                  className={`form-input${fieldErrors.max_volunteers ? ' form-input--error' : ''}`}
                  value={form.max_volunteers}
                  onChange={handleChange}
                  placeholder="e.g. 10"
                  style={{ maxWidth: '160px' }}
                />
                {fieldErrors.max_volunteers && (
                  <p role="alert" style={fieldErrorStyle}>{fieldErrors.max_volunteers}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: 'auto', alignSelf: 'flex-start' }}
              >
                {submitting && <span className="spinner-white" />}
                {submitting ? 'Creating…' : 'Create event'}
              </button>

            </div>
          </form>
        </div>
      )}

      {/* Events list */}
      {!loading && events.length === 0 ? (
        <p style={{
          color: 'var(--color-sage)',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          padding: '0.5rem 0',
        }}>
          No events yet. Create one above to start collecting volunteer sign-ups.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {events.map(event => {
            const isPast = new Date(event.event_date) < new Date()
            const isFull = event.max_volunteers != null && event.signup_count >= event.max_volunteers
            return (
              <div key={event.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.8rem 1.1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '9px',
                background: '#fff',
                opacity: isPast ? 0.65 : 1,
              }}>
                {/* Signup count badge */}
                <span style={{
                  ...monoSm,
                  background: isFull ? 'var(--color-marigold-bg)' : 'var(--color-green-light)',
                  color: isFull ? 'var(--color-marigold)' : 'var(--color-green)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>
                  {event.signup_count}
                  {event.max_volunteers != null ? ` / ${event.max_volunteers}` : ''} signed up
                </span>

                {/* Title */}
                <span style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13.5px',
                  fontWeight: '500',
                  color: 'var(--color-ink)',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {event.title}
                </span>

                {/* Date */}
                <span style={{ ...monoSm, color: 'var(--color-sage)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {formatEventDate(event.event_date)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
