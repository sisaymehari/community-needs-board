'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['volunteers', 'food', 'clothing', 'equipment', 'skills']

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

type Org = { id: string; name: string }

export default function PostNeedPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<Org | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    category: 'volunteers',
    description: '',
    is_urgent: false,
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login?message=Please+log+in+to+post+a+need.')
        return
      }

      const { data: orgData } = await supabase
        .from('organisations')
        .select('id, name')
        .eq('owner_id', session.user.id)
        .single()

      setOrg(orgData ?? null)
      setLoading(false)
    })
  }, [router])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.description.trim()) errors.description = 'Please describe what you need.'
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

    if (!org) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('needs')
        .insert({
          organisation_id: org.id,
          category: form.category,
          description: form.description.trim(),
          is_urgent: form.is_urgent,
        })

      if (error) throw error
      router.push('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  if (!org) {
    return (
      <main className="page-wrap" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--color-sage)', fontSize: '14px', marginTop: '3rem', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          No organisation found for your account. If this is unexpected, please{' '}
          <a href="/signup" className="text-link" style={{ color: 'var(--color-green)' }}>sign up again</a> or contact support.
        </p>
      </main>
    )
  }

  return (
    <main className="page-wrap" style={{ maxWidth: '560px', margin: '0 auto' }}>
      <a href="/" className="text-link" style={{
        fontSize: '13px',
        color: 'var(--color-sage)',
        textDecoration: 'none',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        ← Back to board
      </a>

      <h1 style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: '1.75rem',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'var(--color-ink)',
        margin: '1.5rem 0 0.4rem',
      }}>
        Post a Need
      </h1>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        marginBottom: '2rem',
        fontSize: '13px',
        color: 'var(--color-sage)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        Posting as
        <span style={{ fontWeight: '600', color: 'var(--color-green)' }}>{org.name}</span>
      </div>

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
            <label htmlFor="category" style={labelStyle}>Category</label>
            <select
              id="category"
              name="category"
              className="form-input"
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
            <label htmlFor="description" style={labelStyle}>What do you need?</label>
            <textarea
              id="description"
              name="description"
              className={`form-input${fieldErrors.description ? ' form-input--error' : ''}`}
              style={{ minHeight: '120px', resize: 'vertical' }}
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

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            <input
              type="checkbox"
              name="is_urgent"
              checked={form.is_urgent}
              onChange={handleChange}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-green)', cursor: 'pointer' }}
            />
            Mark as urgent
          </label>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <span className="spinner-white" />}
            {submitting ? 'Posting…' : 'Post Need'}
          </button>

        </div>
      </form>
    </main>
  )
}
