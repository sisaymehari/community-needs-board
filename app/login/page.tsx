'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.email.trim()) errors.email = 'Email is required.'
    if (!form.password) errors.password = 'Password is required.'
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
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })
      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      // Supabase returns "Invalid login credentials" — rephrase it
      setSubmitError(
        message.includes('Invalid login credentials')
          ? 'Email or password is incorrect.'
          : message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap" style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: '700', margin: '1.5rem 0 0.25rem' }}>
        Log in
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2rem' }}>
        Log in to manage your organisation's needs.
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
              placeholder="Your password"
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
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
            Don&apos;t have an account?{' '}
            <a href="/signup" style={{ color: '#1D6A48', textDecoration: 'none', fontWeight: '500' }}>
              Sign up
            </a>
          </p>

        </div>
      </form>
    </main>
  )
}
