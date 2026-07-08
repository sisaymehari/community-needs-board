'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  margin: '0.3rem 0 0',
}

function inputStyle(hasError: boolean) {
  return { ...baseInputStyle, border: `1px solid ${hasError ? '#ef4444' : '#e5e7eb'}` }
}

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    org_name: '',
    org_location: '',
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.org_name.trim()) errors.org_name = 'Organisation name is required.'
    if (!form.org_location.trim()) errors.org_location = 'Location is required.'
    if (!form.email.trim()) errors.email = 'Email is required.'
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Please enter a valid email address.'
    if (!form.password) errors.password = 'Password is required.'
    else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.'
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Sign up failed — please try again.')

      const { error: orgError } = await supabase
        .from('organisations')
        .insert({
          name: form.org_name.trim(),
          location: form.org_location.trim(),
          email: form.email.trim(),
          owner_id: authData.user.id,
        })

      if (orgError) throw orgError

      if (authData.session) {
        // Email confirmation disabled in Supabase — logged in immediately
        router.push('/')
        router.refresh()
      } else {
        // Email confirmation enabled — tell them to check their inbox
        setConfirmationSent(true)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(message)
    } finally {
      setLoading(false)
    }
  }

  if (confirmationSent) {
    return (
      <main className="page-wrap" style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          borderLeft: '4px solid #1D6A48',
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 0.5rem' }}>
            Check your email
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate
            your account, then come back and{' '}
            <a href="/login" style={{ color: '#1D6A48', textDecoration: 'none' }}>log in</a>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap" style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: '700', margin: '1.5rem 0 0.25rem' }}>
        Create an account
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2rem' }}>
        Register your organisation to post needs on the board.
      </p>

      {submitError && (
        <div role="alert" style={{
          background: '#fef2f2', color: '#b91c1c',
          padding: '0.75rem 1rem', borderRadius: '6px',
          marginBottom: '1.5rem', fontSize: '14px',
        }}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <label htmlFor="org_name" style={labelStyle}>Organisation name *</label>
            <input
              id="org_name"
              name="org_name"
              style={inputStyle(!!fieldErrors.org_name)}
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
              name="org_location"
              style={inputStyle(!!fieldErrors.org_location)}
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
            <label htmlFor="email" style={labelStyle}>Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              style={inputStyle(!!fieldErrors.email)}
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. hello@enfieldfoodbank.org"
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" style={fieldErrorStyle}>{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>Password *</label>
            <input
              id="password"
              name="password"
              type="password"
              style={inputStyle(!!fieldErrors.password)}
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <p id="password-error" role="alert" style={fieldErrorStyle}>{fieldErrors.password}</p>
            )}
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#1D6A48', textDecoration: 'none', fontWeight: '500' }}>
              Log in
            </a>
          </p>

        </div>
      </form>
    </main>
  )
}
