'use client'

import { Suspense, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

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

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectMessage = searchParams.get('message')

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
    <main className="page-wrap" style={{ maxWidth: '420px', margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: '1.75rem',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'var(--color-ink)',
        margin: '1.5rem 0 0.35rem',
      }}>
        Log in
      </h1>
      <p style={{ color: 'var(--color-sage)', fontSize: '14px', marginBottom: '2rem', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        Log in to manage your organisation&apos;s needs.
      </p>

      {redirectMessage && (
        <div style={{
          background: 'var(--color-marigold-bg)',
          color: 'var(--color-marigold)',
          padding: '0.75rem 1rem',
          borderRadius: '7px',
          marginBottom: '1.5rem',
          fontSize: '14px',
          border: '1px solid #f5cfa0',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          {redirectMessage}
        </div>
      )}

      {submitError && (
        <div role="alert" style={{
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          padding: '0.75rem 1rem',
          borderRadius: '7px',
          marginBottom: '1.5rem',
          fontSize: '14px',
          border: '1px solid var(--color-error-border)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
              value={form.email}
              onChange={handleChange}
              placeholder="hello@enfieldfoodbank.org"
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
              placeholder="Your password"
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <p id="password-error" role="alert" style={fieldErrorStyle}>{fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <span className="spinner-white" />}
            {loading ? 'Logging in…' : 'Log in'}
          </button>

          <p style={{ fontSize: '13.5px', color: 'var(--color-sage)', textAlign: 'center', margin: 0, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Don&apos;t have an account?{' '}
            <a href="/signup" className="text-link" style={{ color: 'var(--color-green)', textDecoration: 'none', fontWeight: '500' }}>
              Sign up
            </a>
          </p>

        </div>
      </form>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
