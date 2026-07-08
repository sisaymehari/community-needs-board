'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AccountType = 'org' | 'volunteer'

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
  color: '#e05252',
  margin: '0.3rem 0 0',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
}

function TypeToggle({ value, onChange }: { value: AccountType; onChange: (t: AccountType) => void }) {
  const btn = (type: AccountType, label: string, sub: string) => {
    const active = value === type
    return (
      <button
        type="button"
        onClick={() => onChange(type)}
        style={{
          flex: 1,
          padding: '0.9rem 1rem',
          borderRadius: '8px',
          border: `1.5px solid ${active ? 'var(--color-green)' : 'var(--color-border)'}`,
          background: active ? 'var(--color-green-light)' : '#fff',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.12s, background 0.12s',
        }}
      >
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: active ? 'var(--color-green)' : 'var(--color-ink)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          marginBottom: '2px',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '12px',
          color: 'var(--color-sage)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          {sub}
        </div>
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem' }}>
      {btn('org', 'Organisation', 'Post needs to the board')}
      {btn('volunteer', 'Volunteer', 'Browse and offer to help')}
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<AccountType>('org')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    vol_name: '',
    org_name: '',
    org_location: '',
    email: '',
    password: '',
  })

  const handleTypeChange = (t: AccountType) => {
    setAccountType(t)
    setFieldErrors({})
    setSubmitError('')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (accountType === 'org') {
      if (!form.org_name.trim()) errors.org_name = 'Organisation name is required.'
      if (!form.org_location.trim()) errors.org_location = 'Location is required.'
    } else {
      if (!form.vol_name.trim()) errors.vol_name = 'Your name is required.'
    }
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

      const apiRoute = accountType === 'org' ? '/api/create-org' : '/api/create-volunteer'
      const body = accountType === 'org'
        ? { user_id: authData.user.id, name: form.org_name.trim(), location: form.org_location.trim(), email: form.email.trim() }
        : { user_id: authData.user.id, name: form.vol_name.trim(), email: form.email.trim() }

      const res = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error ?? 'Failed to create account — please try again.')
      }

      if (authData.session) {
        router.push('/')
        router.refresh()
      } else {
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
      <main className="page-wrap" style={{ maxWidth: '420px', margin: '0 auto' }}>
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          borderLeft: '4px solid var(--color-green)',
          background: '#fff',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            fontSize: '1.2rem',
            fontWeight: '700',
            margin: '0 0 0.5rem',
            color: 'var(--color-ink)',
          }}>
            Check your email
          </h2>
          <p style={{ color: 'var(--color-sage)', fontSize: '14px', margin: 0, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--color-ink)' }}>{form.email}</strong>.
            Click it to activate your account, then come back and{' '}
            <a href="/login" style={{ color: 'var(--color-green)', textDecoration: 'none' }}>log in</a>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap" style={{ maxWidth: '420px', margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: '1.75rem',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'var(--color-ink)',
        margin: '1.5rem 0 0.35rem',
      }}>
        Create an account
      </h1>
      <p style={{ color: 'var(--color-sage)', fontSize: '14px', marginBottom: '1.75rem', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        Join the community needs board.
      </p>

      {submitError && (
        <div role="alert" style={{
          background: '#fef2f2',
          color: '#c0392b',
          padding: '0.75rem 1rem',
          borderRadius: '7px',
          marginBottom: '1.5rem',
          fontSize: '14px',
          border: '1px solid #fecaca',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <TypeToggle value={accountType} onChange={handleTypeChange} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {accountType === 'volunteer' && (
            <div>
              <label htmlFor="vol_name" style={labelStyle}>Your name</label>
              <input
                id="vol_name"
                name="vol_name"
                className={`form-input${fieldErrors.vol_name ? ' form-input--error' : ''}`}
                value={form.vol_name}
                onChange={handleChange}
                placeholder="e.g. Maya Patel"
                aria-invalid={fieldErrors.vol_name ? true : undefined}
                aria-describedby={fieldErrors.vol_name ? 'vol_name-error' : undefined}
              />
              {fieldErrors.vol_name && (
                <p id="vol_name-error" role="alert" style={fieldErrorStyle}>{fieldErrors.vol_name}</p>
              )}
            </div>
          )}

          {accountType === 'org' && (
            <>
              <div>
                <label htmlFor="org_name" style={labelStyle}>Organisation name</label>
                <input
                  id="org_name"
                  name="org_name"
                  className={`form-input${fieldErrors.org_name ? ' form-input--error' : ''}`}
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
                <label htmlFor="org_location" style={labelStyle}>Location</label>
                <input
                  id="org_location"
                  name="org_location"
                  className={`form-input${fieldErrors.org_location ? ' form-input--error' : ''}`}
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
            </>
          )}

          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" style={fieldErrorStyle}>{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
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

          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <span className="spinner-white" />}
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p style={{ fontSize: '13.5px', color: 'var(--color-sage)', textAlign: 'center', margin: 0, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--color-green)', textDecoration: 'none', fontWeight: '500' }}>
              Log in
            </a>
          </p>

        </div>
      </form>
    </main>
  )
}
