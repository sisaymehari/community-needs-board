'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Need } from '@/lib/types'

const CATEGORY_ICONS: Record<string, string> = {
  volunteers: '🙋',
  food: '🍎',
  clothing: '👕',
  equipment: '🔧',
  skills: '💡',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
}

export default function NeedCard({ need, onFulfilled }: { need: Need; onFulfilled: (id: string) => void }) {
  const [fulfilling, setFulfilling] = useState(false)
  const [fulfillError, setFulfillError] = useState('')
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [offerError, setOfferError] = useState('')
  const [offerFieldErrors, setOfferFieldErrors] = useState<{ name?: string; email?: string }>({})
  const [offer, setOffer] = useState({ name: '', email: '', message: '' })

  // Volunteer auto-fill: checked lazily on first "Offer to Help" click
  type VolunteerProfile = { id: string; name: string; email: string }
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null)
  const volunteerChecked = useRef(false)

  const handleFulfill = async () => {
    setFulfilling(true)
    setFulfillError('')
    const { data, error } = await supabase
      .from('needs')
      .update({ is_fulfilled: true })
      .eq('id', need.id)
      .select('id')

    if (error) {
      setFulfillError('Something went wrong. Please try again.')
    } else if (!data || data.length === 0) {
      setFulfillError("You don't have permission to update this need.")
    } else {
      onFulfilled(need.id)
    }
    setFulfilling(false)
  }

  const handleOfferChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setOffer(prev => ({ ...prev, [name]: value }))
    if (offerFieldErrors[name as keyof typeof offerFieldErrors]) {
      setOfferFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateOffer = () => {
    const errors: { name?: string; email?: string } = {}
    if (!volunteer) {
      // Manual fields only shown for anonymous / org users
      if (!offer.name.trim()) errors.name = 'Your name is required.'
      if (!offer.email.trim()) errors.email = 'Your email is required.'
      else if (!EMAIL_RE.test(offer.email.trim())) errors.email = 'Please enter a valid email address.'
    }
    return errors
  }

  const handleOfferToHelp = async () => {
    if (!volunteerChecked.current) {
      volunteerChecked.current = true
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase
          .from('volunteers')
          .select('name, email')
          .eq('id', session.user.id)
          .maybeSingle()
        if (data) setVolunteer({ id: session.user.id, name: data.name, email: data.email })
      }
    }
    setShowOfferForm(prev => !prev)
  }

  const notifyOrganisation = async (
    helperName: string,
    helperEmail: string,
    helperMessage: string | null,
  ) => {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('name, email')
        .eq('id', need.organisation_id)
        .single()

      if (orgError || !orgData?.email) {
        console.error('[notify] org lookup failed', { organisation_id: need.organisation_id, orgError })
        return
      }

      const { error: fnError } = await supabase.functions.invoke('send-offer-notification', {
        body: {
          orgEmail: orgData.email,
          orgName: orgData.name,
          needDescription: need.description,
          helperName,
          helperEmail,
          helperMessage,
        },
      })

      if (fnError) console.error('[notify] edge function returned error', fnError)
    } catch (err) {
      console.error('[notify] unexpected error', err)
    }
  }

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOfferError('')

    const errors = validateOffer()
    if (Object.keys(errors).length > 0) {
      setOfferFieldErrors(errors)
      return
    }

    const helperName = volunteer ? volunteer.name : offer.name.trim()
    const helperEmail = volunteer ? volunteer.email : offer.email.trim()
    const helperMessage = offer.message.trim() || null

    setSubmitting(true)
    const { error } = await supabase
      .from('offers')
      .insert({
        need_id: need.id,
        name: helperName,
        email: helperEmail,
        message: helperMessage,
        ...(volunteer ? { volunteer_id: volunteer.id } : {}),
      })

    if (error) {
      setOfferError('Something went wrong. Please try again.')
    } else {
      setSubmitted(true)
      setShowOfferForm(false)
      notifyOrganisation(helperName, helperEmail, helperMessage)
    }
    setSubmitting(false)
  }

  const pinColor = need.is_urgent ? 'var(--color-marigold)' : 'var(--color-green)'

  return (
    <div style={{
      position: 'relative',
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '1.4rem 1.5rem 1.25rem',
      background: '#fff',
    }}>
      {/* Corkboard pin */}
      <span aria-hidden="true" style={{
        position: 'absolute',
        top: '-5px',
        left: '20px',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: pinColor,
        boxShadow: `0 2px 4px rgba(0,0,0,0.18), 0 0 0 2px var(--color-bg)`,
        display: 'block',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
            {CATEGORY_ICONS[need.category] || '📌'}
          </span>
          <span style={{
            ...monoSm,
            background: 'var(--color-green-light)',
            color: 'var(--color-green)',
            padding: '2px 9px',
            borderRadius: '100px',
            textTransform: 'capitalize',
          }}>
            {need.category}
          </span>
          {need.is_urgent && (
            <span style={{
              ...monoSm,
              background: 'var(--color-marigold-bg)',
              color: 'var(--color-marigold)',
              padding: '2px 9px',
              borderRadius: '100px',
            }}>
              urgent
            </span>
          )}
        </div>
        <span style={{ ...monoSm, color: 'var(--color-sage)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
          {new Date(need.created_at).toLocaleDateString('en-GB')}
        </span>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '15px',
        color: 'var(--color-ink)',
        marginBottom: '1rem',
        lineHeight: '1.65',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        {need.description}
      </p>

      {/* Footer row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-sage)' }}>
          <a
            href={`/org/${need.organisation_id}`}
            style={{ color: 'var(--color-green)', textDecoration: 'none', fontWeight: '500' }}
          >
            {need.organisations?.name}
          </a>
          {need.organisations?.location && (
            <span style={{ color: 'var(--color-border)', margin: '0 4px' }}>·</span>
          )}
          {need.organisations?.location}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {!submitted && (
            <button
              onClick={handleOfferToHelp}
              className="card-action-btn"
            >
              {showOfferForm ? 'Cancel' : 'Offer to Help'}
            </button>
          )}
          <button
            onClick={handleFulfill}
            disabled={fulfilling}
            className="card-action-btn"
            style={{ cursor: fulfilling ? 'not-allowed' : undefined }}
          >
            {fulfilling && <span className="spinner-grey" style={{ marginRight: '5px' }} />}
            {fulfilling ? 'Saving…' : 'Mark as fulfilled'}
          </button>
        </div>
      </div>

      {fulfillError && (
        <p role="alert" style={{ fontSize: '12px', color: 'var(--color-marigold)', marginTop: '0.4rem' }}>
          {fulfillError}
        </p>
      )}

      {submitted && (
        <p style={{
          fontSize: '13px',
          color: 'var(--color-green)',
          marginTop: '0.75rem',
          fontWeight: '500',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          Thanks! The charity will be in touch.
        </p>
      )}

      {showOfferForm && (
        <form
          onSubmit={handleOfferSubmit}
          noValidate
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          {volunteer ? (
            <div style={{
              fontSize: '13px',
              color: 'var(--color-sage)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              padding: '0.5rem 0.75rem',
              background: 'var(--color-green-light)',
              borderRadius: '6px',
            }}>
              Offering as <strong style={{ color: 'var(--color-green)' }}>{volunteer.name}</strong>
            </div>
          ) : (
            <>
              <div>
                <input
                  className={`form-input${offerFieldErrors.name ? ' form-input--error' : ''}`}
                  name="name"
                  value={offer.name}
                  onChange={handleOfferChange}
                  placeholder="Your name"
                  aria-label="Your name"
                  aria-invalid={offerFieldErrors.name ? true : undefined}
                  aria-describedby={offerFieldErrors.name ? `${need.id}-name-error` : undefined}
                />
                {offerFieldErrors.name && (
                  <p id={`${need.id}-name-error`} role="alert" style={{ fontSize: '12px', color: 'var(--color-error)', margin: '0.25rem 0 0' }}>
                    {offerFieldErrors.name}
                  </p>
                )}
              </div>
              <div>
                <input
                  className={`form-input${offerFieldErrors.email ? ' form-input--error' : ''}`}
                  type="email"
                  name="email"
                  value={offer.email}
                  onChange={handleOfferChange}
                  placeholder="Your email"
                  aria-label="Your email"
                  aria-invalid={offerFieldErrors.email ? true : undefined}
                  aria-describedby={offerFieldErrors.email ? `${need.id}-email-error` : undefined}
                />
                {offerFieldErrors.email && (
                  <p id={`${need.id}-email-error`} role="alert" style={{ fontSize: '12px', color: 'var(--color-error)', margin: '0.25rem 0 0' }}>
                    {offerFieldErrors.email}
                  </p>
                )}
              </div>
            </>
          )}

          <textarea
            className="form-input"
            style={{ minHeight: '60px', resize: 'vertical' }}
            name="message"
            value={offer.message}
            onChange={handleOfferChange}
            placeholder="Message (optional)"
            aria-label="Message (optional)"
          />

          {offerError && (
            <p role="alert" style={{ fontSize: '12px', color: 'var(--color-error)', margin: 0 }}>{offerError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: 'auto', alignSelf: 'flex-start', fontSize: '13px', padding: '0.5rem 1rem' }}
          >
            {submitting && <span className="spinner-white" />}
            {submitting ? 'Sending…' : 'Send Offer'}
          </button>
        </form>
      )}
    </div>
  )
}
