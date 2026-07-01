'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['volunteers', 'food', 'clothing', 'equipment', 'skills']

export default function PostNeedPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    org_name: '',
    org_location: '',
    org_email: '',
    category: 'volunteers',
    description: '',
    is_urgent: false,
  })

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // First create or find the organisation
      const { data: org, error: orgError } = await supabase
        .from('organisations')
        .insert({
          name: form.org_name,
          location: form.org_location,
          email: form.org_email,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Then create the need linked to that org
      const { error: needError } = await supabase
        .from('needs')
        .insert({
          organisation_id: org.id,
          category: form.category,
          description: form.description,
          is_urgent: form.is_urgent,
        })

      if (needError) throw needError

      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.8rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'sans-serif',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '0.4rem',
    color: '#374151'
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

      {error && (
        <div style={{
          background: '#fef2f2', color: '#ef4444',
          padding: '0.75rem 1rem', borderRadius: '6px',
          marginBottom: '1.5rem', fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <label style={labelStyle}>Organisation name *</label>
            <input
              style={inputStyle}
              name="org_name"
              value={form.org_name}
              onChange={handleChange}
              placeholder="e.g. Enfield Food Bank"
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Location *</label>
            <input
              style={inputStyle}
              name="org_location"
              value={form.org_location}
              onChange={handleChange}
              placeholder="e.g. Enfield, North London"
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Contact email *</label>
            <input
              style={inputStyle}
              type="email"
              name="org_email"
              value={form.org_email}
              onChange={handleChange}
              placeholder="e.g. hello@enfieldfoodbank.org"
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Category *</label>
            <select
              style={inputStyle}
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
            <label style={labelStyle}>What do you need? *</label>
            <textarea
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. We need 3 volunteers this Saturday 10am–2pm to help sort food donations at our warehouse."
              required
            />
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
              width: '100%'
            }}
          >
            {loading ? 'Posting...' : 'Post Need'}
          </button>

        </div>
      </form>
    </main>
  )
}