'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11.5px',
  fontWeight: '500',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-sage)',
  margin: 0,
}

export default function DashReportSection({ orgId }: { orgId: string }) {
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setCopied(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Your session has expired. Please log in again.')
        return
      }

      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session.user.id, organisation_id: orgId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong generating your report. Please try again.')
        return
      }

      const data = await res.json()
      setReport(data.report ?? '')
    } catch {
      setError('Something went wrong generating your report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  return (
    <section style={{
      marginTop: '3rem',
      paddingTop: '3rem',
      borderTop: '1px solid var(--color-border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={sectionHeading}>Impact Report</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary"
          style={{ width: 'auto' }}
        >
          {generating && <span className="spinner-white" />}
          {generating ? 'Generating…' : report ? 'Regenerate report' : 'Generate Impact Report'}
        </button>
      </div>

      <p style={{
        color: 'var(--color-sage)',
        fontSize: '13.5px',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginBottom: report || error ? '1.25rem' : 0,
      }}>
        Get an AI-written summary of your organisation&apos;s impact, based on your real activity — ready to share with trustees or funders.
      </p>

      {error && (
        <div role="alert" style={{
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          padding: '0.75rem 1rem',
          borderRadius: '7px',
          marginBottom: report ? '1.25rem' : 0,
          fontSize: '14px',
          border: '1px solid var(--color-error-border)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          {error}
        </div>
      )}

      {report && (
        <div style={{
          border: '1px solid var(--color-green)',
          background: 'var(--color-green-light)',
          borderRadius: '10px',
          padding: '1.5rem 1.75rem',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}>
            <span style={{
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
              fontSize: '11px',
              fontWeight: '500',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-green)',
            }}>
              AI-Generated Summary
            </span>
            <button onClick={handleCopy} className="card-action-btn">
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <p style={{
            fontSize: '15px',
            color: 'var(--color-ink)',
            lineHeight: '1.7',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}>
            {report}
          </p>
        </div>
      )}
    </section>
  )
}
