'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['volunteers', 'food', 'clothing', 'equipment', 'skills']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const baseInputStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '6px',
  fontSize: '15px',
  outline: 'none',
  fontFamily: 'sans-serif',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500' as const,
  marginBottom: '0.4rem',
  color: '#374151',
}

const fieldErrorStyle = {
  fontSize: '13px',
  color: '#ef4444',
  marginTop: '0.3rem',
  margin: '0.3rem 0 0',
}

function inputStyle(hasError: boolean) {
  return { ...baseInputStyle, border: `1px solid ${hasError ? '#ef4444' : '#e5e7eb'}` }
}

export default function PostNeedPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    org_name: '',
    org_location: '',
    org_email: '',
    category: 'volunteers',
    description: '',
    is_urgent: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.org_name.trim())
      errors.org_name = 'Organisation name is required.'
    if (!form.org_location.trim())
      errors.org_location = 'Location is required.'
    if (!form.org_email.trim())
      errors.org_email = 'Contact email is required.'
    else if (!EMAIL_RE.test(form.org_email.trim()))
      errors.org_email = 'Please enter a valid email address.'
    if (!form.description.trim())
      errors.description = 'Please describe what you need.'
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

    setLoading(true)
    try {
      const { data: org, error: orgError } = await supabase
        .from('organisations')
        .insert({
          name: form.org_name.trim(),
          location: form.org_location.trim(),
          email: form.org_email.trim(),
        })
        .select()
        .single()

      if (orgError) throw orgError

      const { error: needError } = await supabase
        .from('needs')
        .insert({
          organisation_id: org.id,
          category: form.category,
          description: form.description.trim(),
          is_urgent: form.is_urgent,
        })

      if (needError) throw needError

      router.push('/')
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <a href="/" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
        ← Back to board
      </a>

      <h1 style={{ fontSize: '1.6rem', fontWeight: '700', margin: '1.5rem 0 0.5rem' }}>
        Post a Need
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2rem' }}>
        Tell the community what your organisation needs right now.
      </p>

      {submitError && (
        <div
          role="alert"
          style={{
            background: '#fef2f2', color: '#ef4444',
            padding: '0.75rem 1rem', borderRadius: '6px',
            marginBottom: '1.5rem', fontSize: '14px',
          }}
        >
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <label htmlFor="org_name" style={labelStyle}>Organisation name *</label>
            <input
              id="org_name"
              style={inputStyle(!!fieldErrors.org_name)}
              name="org_name"
              value={form.org_name}
              onChange={handleChange}
              placeholder="e.g. Enfield Food Bank"
              aria-invalid={fieldErrors.org_name ? true : undefined}
              aria-describedby={fieldErrors.org_name ? 'org_name-error' : undefined}
            />
            {fieldErrors.org_name && (
              <p id="org_name-error" role="alert" style={fieldErrorStyle}>{fieldErrors.org_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="org_location" style={labelStyle}>Location *</label>
            <input
              id="org_location"
              style={inputStyle(!!fieldErrors.org_location)}
              name="org_location"
              value={form.org_location}
              onChange={handleChange}
              placeholder="e.g. Enfield, North London"
              aria-invalid={fieldErrors.org_location ? true : undefined}
              aria-describedby={fieldErrors.org_location ? 'org_location-error' : undefined}
            />
            {fieldErrors.org_location && (
              <p id="org_location-error" role="alert" style={fieldErrorStyle}>{fieldErrors.org_location}</p>
            )}
          </div>

          <div>
            <label htmlFor="org_email" style={labelStyle}>Contact email *</label>
            <input
              id="org_email"
              style={inputStyle(!!fieldErrors.org_email)}
              type="email"
              name="org_email"
              value={form.org_email}
              onChange={handleChange}
              placeholder="e.g. hello@enfieldfoodbank.org"
              aria-invalid={fieldErrors.org_email ? true : undefined}
              aria-describedby={fieldErrors.org_email ? 'org_email-error' : undefined}
            />
            {fieldErrors.org_email && (
              <p id="org_email-error" role="alert" style={fieldErrorStyle}>{fieldErrors.org_email}</p>
            )}
          </div>

          <div>
            <label htmlFor="category" style={labelStyle}>Category *</label>
            <select
              id="category"
              style={inputStyle(false)}
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" style={labelStyle}>What do you need? *</label>
            <textarea
              id="description"
              style={{ ...inputStyle(!!fieldErrors.description), minHeight: '120px', resize: 'vertical' }}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. We need 3 volunteers this Saturday 10am–2pm to help sort food donations at our warehouse."
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={fieldErrors.description ? 'description-error' : undefined}
            />
            {fieldErrors.description && (
              <p id="description-error" role="alert" style={fieldErrorStyle}>{fieldErrors.description}</p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="is_urgent"
              name="is_urgent"
              checked={form.is_urgent}
              onChange={handleChange}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_urgent" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
              Mark as urgent
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : '#1D6A48',
              color: '#fff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '15px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading && <span className="spinner-white" />}
            {loading ? 'Posting...' : 'Post Need'}
          </button>

        </div>
      </form>
    </main>
  )
}
