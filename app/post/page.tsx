'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['volunteers', 'food', 'clothing', 'equipment', 'skills']

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

  // Show nothing while checking session (avoids flash before redirect)
  if (loading) return null

  // Logged in but no org row found (shouldn't happen in normal flow)
  if (!org) {
    return (
      <main className="page-wrap" style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '3rem' }}>
          No organisation found for your account. If this is unexpected, please{' '}
          <a href="/signup" style={{ color: '#1D6A48' }}>sign up again</a> or contact support.
        </p>
      </main>
    )
  }

  return (
    <main className="page-wrap" style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <a href="/" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
        ← Back to board
      </a>

      <h1 style={{ fontSize: '1.6rem', fontWeight: '700', margin: '1.5rem 0 0.25rem' }}>
        Post a Need
      </h1>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '2rem',
        fontSize: '14px',
        color: '#6b7280',
      }}>
        Posting as
        <span style={{ fontWeight: '600', color: '#1D6A48' }}>{org.name}</span>
      </div>

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
            <label htmlFor="category" style={labelStyle}>Category *</label>
            <select
              id="category"
              name="category"
              style={inputStyle(false)}
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
              name="description"
              style={{ ...inputStyle(!!fieldErrors.description), minHeight: '120px', resize: 'vertical' }}
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
            disabled={submitting}
            style={{
              background: submitting ? '#9ca3af' : '#1D6A48',
              color: '#fff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '15px',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {submitting && <span className="spinner-white" />}
            {submitting ? 'Posting...' : 'Post Need'}
          </button>

        </div>
      </form>
    </main>
  )
}
