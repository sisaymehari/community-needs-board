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

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.7rem',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'sans-serif',
}

export default function NeedCard({ need, onFulfilled }: { need: Need; onFulfilled: (id: string) => void }) {
  const [fulfilling, setFulfilling] = useState(false)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [offer, setOffer] = useState({ name: '', email: '', message: '' })

  const handleFulfill = async () => {
    setFulfilling(true)
    const { error } = await supabase
      .from('needs')
      .update({ is_fulfilled: true })
      .eq('id', need.id)

    if (!error) {
      onFulfilled(need.id)
    }
    setFulfilling(false)
  }

  const handleOfferChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setOffer(prev => ({ ...prev, [name]: value }))
  }

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await supabase
      .from('offers')
      .insert({
        need_id: need.id,
        name: offer.name,
        email: offer.email,
        message: offer.message || null,
      })

    if (!error) {
      setSubmitted(true)
      setShowOfferForm(false)
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          <a
            href={`/org/${need.organisation_id}`}
            style={{ color: '#1D6A48', textDecoration: 'none', fontWeight: '500' }}
          >
            {need.organisations?.name}
          </a>
          {need.organisations?.location && ` · ${need.organisations.location}`}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {!submitted && (
            <button
              onClick={() => setShowOfferForm(prev => !prev)}
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
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '3px 8px',
              cursor: fulfilling ? 'not-allowed' : 'pointer',
            }}
          >
            {fulfilling ? 'Updating...' : 'Mark as fulfilled'}
          </button>
        </div>
      </div>

      {submitted && (
        <p style={{ fontSize: '13px', color: '#1D6A48', marginTop: '0.75rem', fontWeight: '500' }}>
          Thanks! The charity will be in touch.
        </p>
      )}

      {showOfferForm && (
        <form
          onSubmit={handleOfferSubmit}
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <input
            style={inputStyle}
            name="name"
            value={offer.name}
            onChange={handleOfferChange}
            placeholder="Your name"
            required
          />
          <input
            style={inputStyle}
            type="email"
            name="email"
            value={offer.email}
            onChange={handleOfferChange}
            placeholder="Your email"
            required
          />
          <textarea
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            name="message"
            value={offer.message}
            onChange={handleOfferChange}
            placeholder="Message (optional)"
          />
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
            }}
          >
            {submitting ? 'Sending...' : 'Send Offer'}
          </button>
        </form>
      )}
    </div>
  )
}
