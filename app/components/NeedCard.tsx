'use client'

import { useState } from 'react'
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

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.7rem',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'sans-serif',
}

const fieldErrorStyle = {
  fontSize: '12px',
  color: '#ef4444',
  margin: '0.25rem 0 0',
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
    if (!offer.name.trim()) errors.name = 'Your name is required.'
    if (!offer.email.trim()) errors.email = 'Your email is required.'
    else if (!EMAIL_RE.test(offer.email.trim())) errors.email = 'Please enter a valid email address.'
    return errors
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

      if (fnError) {
        console.error('[notify] edge function returned error', fnError)
      }
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

    const helperName = offer.name.trim()
    const helperEmail = offer.email.trim()
    const helperMessage = offer.message.trim() || null

    setSubmitting(true)
    const { error } = await supabase
      .from('offers')
      .insert({
        need_id: need.id,
        name: helperName,
        email: helperEmail,
        message: helperMessage,
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

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        borderLeft: need.is_urgent ? '4px solid #ef4444' : '4px solid #1D6A48',
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>
            {CATEGORY_ICONS[need.category] || '📌'}
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: '500',
            background: '#f3f4f6',
            padding: '2px 10px',
            borderRadius: '100px',
            textTransform: 'capitalize',
          }}>
            {need.category}
          </span>
          {need.is_urgent && (
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              background: '#fef2f2',
              color: '#ef4444',
              padding: '2px 10px',
              borderRadius: '100px',
            }}>
              Urgent
            </span>
          )}
        </div>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          {new Date(need.created_at).toLocaleDateString('en-GB')}
        </span>
      </div>

      <p style={{ fontSize: '15px', color: '#111827', marginBottom: '0.75rem', lineHeight: '1.6' }}>
        {need.description}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          <a
            href={`/org/${need.organisation_id}`}
            style={{ color: '#1D6A48', textDecoration: 'none', fontWeight: '500' }}
          >
            {need.organisations?.name}
          </a>
          {need.organisations?.location && ` · ${need.organisations.location}`}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {!submitted && (
            <button
              onClick={() => setShowOfferForm(prev => !prev)}
              className="card-action-btn"
              style={{
                fontSize: '12px',
                color: '#9ca3af',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              {showOfferForm ? 'Cancel' : 'Offer to Help'}
            </button>
          )}
          <button
            onClick={handleFulfill}
            disabled={fulfilling}
            className="card-action-btn"
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '3px 8px',
              cursor: fulfilling ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {fulfilling && <span className="spinner-grey" />}
            {fulfilling ? 'Saving...' : 'Mark as fulfilled'}
          </button>
        </div>
      </div>

      {fulfillError && (
        <p role="alert" style={{ fontSize: '12px', color: '#ef4444', marginTop: '0.4rem' }}>
          {fulfillError}
        </p>
      )}

      {submitted && (
        <p style={{ fontSize: '13px', color: '#1D6A48', marginTop: '0.75rem', fontWeight: '500' }}>
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
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div>
            <input
              style={{
                ...inputStyle,
                border: `1px solid ${offerFieldErrors.name ? '#ef4444' : '#e5e7eb'}`,
              }}
              name="name"
              value={offer.name}
              onChange={handleOfferChange}
              placeholder="Your name"
              aria-label="Your name"
              aria-invalid={offerFieldErrors.name ? true : undefined}
              aria-describedby={offerFieldErrors.name ? `${need.id}-name-error` : undefined}
            />
            {offerFieldErrors.name && (
              <p id={`${need.id}-name-error`} role="alert" style={fieldErrorStyle}>{offerFieldErrors.name}</p>
            )}
          </div>

          <div>
            <input
              style={{
                ...inputStyle,
                border: `1px solid ${offerFieldErrors.email ? '#ef4444' : '#e5e7eb'}`,
              }}
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
              <p id={`${need.id}-email-error`} role="alert" style={fieldErrorStyle}>{offerFieldErrors.email}</p>
            )}
          </div>

          <textarea
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            name="message"
            value={offer.message}
            onChange={handleOfferChange}
            placeholder="Message (optional)"
            aria-label="Message (optional)"
          />

          {offerError && (
            <p role="alert" style={{ fontSize: '12px', color: '#ef4444', margin: 0 }}>{offerError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              alignSelf: 'flex-start',
              background: submitting ? '#9ca3af' : '#1D6A48',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {submitting && <span className="spinner-white" />}
            {submitting ? 'Sending...' : 'Send Offer'}
          </button>
        </form>
      )}
    </div>
  )
}
