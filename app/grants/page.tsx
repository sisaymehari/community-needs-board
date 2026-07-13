'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Status = 'planned' | 'submitted' | 'awarded' | 'rejected'

type GrantRow = {
  id: string
  grant_name: string
  funder: string | null
  amount: number | null
  deadline: string
  status: Status
  notes: string | null
  created_at: string
}

const STATUSES: Status[] = ['planned', 'submitted', 'awarded', 'rejected']

const STATUS_LABEL: Record<Status, string> = {
  planned: 'Planned',
  submitted: 'Submitted',
  awarded: 'Awarded',
  rejected: 'Rejected',
}

const STATUS_COLOR: Record<Status, { bg: string; fg: string }> = {
  planned: { bg: 'var(--color-green-light)', fg: 'var(--color-green)' },
  submitted: { bg: 'var(--color-marigold-bg)', fg: 'var(--color-marigold)' },
  awarded: { bg: 'var(--color-green-light)', fg: 'var(--color-green)' },
  rejected: { bg: 'var(--color-error-bg)', fg: 'var(--color-error)' },
}

const monoLabel: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11.5px',
  fontWeight: '500',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-sage)',
  marginBottom: '1.25rem',
}

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
}

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

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysUntil(dateStr: string): number {
  const deadline = new Date(dateStr)
  deadline.setHours(0, 0, 0, 0)
  const diffMs = deadline.getTime() - startOfToday().getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export default function GrantsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null)
  const [grants, setGrants] = useState<GrantRow[]>([])
  const [form, setForm] = useState({
    grant_name: '',
    funder: '',
    amount: '',
    deadline: '',
    status: 'planned' as Status,
    notes: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?message=Please+log+in+to+view+your+grants.')
        return
      }

      const { data: orgData } = await supabase
        .from('organisations')
        .select('id, name')
        .eq('owner_id', session.user.id)
        .maybeSingle()

      if (!orgData) {
        router.replace('/')
        return
      }

      setOrg(orgData)

      const { data } = await supabase
        .from('grants')
        .select('id, grant_name, funder, amount, deadline, status, notes, created_at')
        .eq('organisation_id', orgData.id)
        .order('deadline', { ascending: true })

      setGrants((data as GrantRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.grant_name.trim()) errors.grant_name = 'Grant name is required.'
    if (!form.deadline) errors.deadline = 'Deadline is required.'
    if (form.amount.trim() && (isNaN(Number(form.amount)) || Number(form.amount) < 0))
      errors.amount = 'Please enter a valid amount.'
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
      const payload = {
        organisation_id: org.id,
        grant_name: form.grant_name.trim(),
        funder: form.funder.trim() || null,
        amount: form.amount.trim() ? Number(form.amount) : null,
        deadline: form.deadline,
        status: form.status,
        notes: form.notes.trim() || null,
      }

      const { data, error } = await supabase
        .from('grants')
        .insert(payload)
        .select('id, grant_name, funder, amount, deadline, status, notes, created_at')
        .single()

      if (error) throw error

      setGrants(prev =>
        [...prev, data as GrantRow].sort(
          (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        )
      )
      setForm({ grant_name: '', funder: '', amount: '', deadline: '', status: 'planned', notes: '' })
      setFieldErrors({})
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (grant: GrantRow, status: Status) => {
    if (status === grant.status) return

    setPendingIds(prev => new Set(prev).add(grant.id))
    setGrants(prev => prev.map(g => (g.id === grant.id ? { ...g, status } : g)))

    const { data, error } = await supabase
      .from('grants')
      .update({ status })
      .eq('id', grant.id)
      .select('id, grant_name, funder, amount, deadline, status, notes, created_at')
      .single()

    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(grant.id)
      return next
    })

    if (error) {
      setGrants(prev => prev.map(g => (g.id === grant.id ? grant : g)))
      return
    }

    setGrants(prev => prev.map(g => (g.id === grant.id ? (data as GrantRow) : g)))
  }

  const deleteGrant = async (grant: GrantRow) => {
    setPendingIds(prev => new Set(prev).add(grant.id))
    const previousGrants = grants
    setGrants(prev => prev.filter(g => g.id !== grant.id))

    const { error } = await supabase.from('grants').delete().eq('id', grant.id)

    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(grant.id)
      return next
    })

    if (error) {
      setGrants(previousGrants)
    }
  }

  if (loading) return null

  return (
    <main className="page-wrap" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <a href="/" style={{
        fontSize: '13px',
        color: 'var(--color-sage)',
        textDecoration: 'none',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        ← Back to board
      </a>

      <h1 style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: 'clamp(1.6rem, 3.5vw, 2rem)',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'var(--color-ink)',
        margin: '1.5rem 0 0.2rem',
      }}>
        Grants
      </h1>
      <p style={{
        color: 'var(--color-sage)',
        fontSize: '13px',
        marginBottom: '2.5rem',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        Deadline tracking for{' '}
        <span style={{ fontWeight: '600', color: 'var(--color-green)' }}>{org?.name}</span>
      </p>

      {/* Add a grant */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={monoLabel}>Add a Grant</h2>

        {submitError && (
          <div role="alert" style={{
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            padding: '0.75rem 1rem',
            borderRadius: '7px',
            marginBottom: '1.25rem',
            fontSize: '14px',
            border: '1px solid var(--color-error-border)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

            <div>
              <label htmlFor="grant_name" style={labelStyle}>
                Grant name
              </label>
              <input
                id="grant_name"
                name="grant_name"
                className={`form-input${fieldErrors.grant_name ? ' form-input--error' : ''}`}
                value={form.grant_name}
                onChange={handleChange}
                placeholder="e.g. Community Resilience Fund"
                aria-invalid={fieldErrors.grant_name ? true : undefined}
                aria-describedby={fieldErrors.grant_name ? 'grant_name-error' : undefined}
              />
              {fieldErrors.grant_name && (
                <p id="grant_name-error" role="alert" style={fieldErrorStyle}>{fieldErrors.grant_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="funder" style={labelStyle}>
                Funder{' '}
                <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="funder"
                name="funder"
                className="form-input"
                value={form.funder}
                onChange={handleChange}
                placeholder="e.g. National Lottery"
              />
            </div>

            <div style={{ display: 'flex', gap: '1.1rem' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="amount" style={labelStyle}>
                  Amount (£){' '}
                  <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`form-input${fieldErrors.amount ? ' form-input--error' : ''}`}
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="e.g. 5000.00"
                  aria-invalid={fieldErrors.amount ? true : undefined}
                  aria-describedby={fieldErrors.amount ? 'amount-error' : undefined}
                />
                {fieldErrors.amount && (
                  <p id="amount-error" role="alert" style={fieldErrorStyle}>{fieldErrors.amount}</p>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label htmlFor="deadline" style={labelStyle}>
                  Deadline
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  className={`form-input${fieldErrors.deadline ? ' form-input--error' : ''}`}
                  value={form.deadline}
                  onChange={handleChange}
                  aria-invalid={fieldErrors.deadline ? true : undefined}
                  aria-describedby={fieldErrors.deadline ? 'deadline-error' : undefined}
                />
                {fieldErrors.deadline && (
                  <p id="deadline-error" role="alert" style={fieldErrorStyle}>{fieldErrors.deadline}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="status" style={labelStyle}>
                Status
              </label>
              <select
                id="status"
                name="status"
                className="form-input"
                value={form.status}
                onChange={handleChange}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="notes" style={labelStyle}>
                Notes{' '}
                <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                className="form-input"
                style={{ minHeight: '70px', resize: 'vertical' }}
                value={form.notes}
                onChange={handleChange}
                placeholder="e.g. Requires two references, apply via online portal"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: 'auto', alignSelf: 'flex-start' }}
            >
              {submitting && <span className="spinner-white" />}
              {submitting ? 'Adding…' : 'Add grant'}
            </button>

          </div>
        </form>
      </section>

      {/* Grant list */}
      <section>
        <h2 style={monoLabel}>All Grants</h2>

        {grants.length === 0 ? (
          <p style={{
            color: 'var(--color-sage)',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            padding: '1.5rem 0',
          }}>
            No grants tracked yet. Use the form above to add your first one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '8px' }}>
            {grants.map(grant => {
              const isPending = pendingIds.has(grant.id)
              const days = daysUntil(grant.deadline)
              const isOverdue = days < 0 && grant.status !== 'awarded' && grant.status !== 'rejected'
              const isUpcoming = days >= 0 && days <= 14 && grant.status !== 'awarded' && grant.status !== 'rejected'
              const flagBg = isOverdue ? 'var(--color-error-bg)' : 'var(--color-marigold-bg)'
              const flagBorder = isOverdue ? 'var(--color-error-border)' : 'var(--color-marigold)'

              return (
                <div key={grant.id} style={{
                  position: 'relative',
                  border: `1px solid ${isOverdue || isUpcoming ? flagBorder : 'var(--color-border)'}`,
                  borderRadius: '10px',
                  padding: '1.25rem 1.5rem 1.1rem',
                  background: isOverdue || isUpcoming ? flagBg : '#fff',
                  opacity: isPending ? 0.6 : 1,
                  transition: 'opacity 0.12s',
                }}>
                  {/* Header row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.6rem',
                    gap: '0.75rem',
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: 'var(--color-ink)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        marginBottom: '2px',
                      }}>
                        {grant.grant_name}
                      </div>
                      {grant.funder && (
                        <div style={{
                          fontSize: '13px',
                          color: 'var(--color-sage)',
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        }}>
                          {grant.funder}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {grant.amount != null && (
                        <div style={{
                          fontFamily: 'var(--font-ibm-plex-mono), monospace',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: 'var(--color-ink)',
                          letterSpacing: '-0.01em',
                        }}>
                          {formatCurrency(grant.amount)}
                        </div>
                      )}
                      <div style={{
                        ...monoSm,
                        color: isOverdue ? 'var(--color-error)' : isUpcoming ? 'var(--color-marigold)' : 'var(--color-sage)',
                        marginTop: '3px',
                      }}>
                        {new Date(grant.deadline).toLocaleDateString('en-GB')}
                        {isOverdue && ' · overdue'}
                        {isUpcoming && ` · ${days === 0 ? 'due today' : days === 1 ? '1 day left' : `${days} days left`}`}
                      </div>
                    </div>
                  </div>

                  {/* Status + actions row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginTop: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        ...monoSm,
                        background: STATUS_COLOR[grant.status].bg,
                        color: STATUS_COLOR[grant.status].fg,
                        padding: '2px 9px',
                        borderRadius: '100px',
                      }}>
                        {STATUS_LABEL[grant.status]}
                      </span>
                      <select
                        className="form-input"
                        value={grant.status}
                        disabled={isPending}
                        onChange={e => updateStatus(grant, e.target.value as Status)}
                        aria-label={`Update status for ${grant.grant_name}`}
                        style={{
                          width: 'auto',
                          padding: '0.3rem 0.6rem',
                          fontSize: '12.5px',
                        }}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="card-action-btn"
                      onClick={() => deleteGrant(grant)}
                      disabled={isPending}
                      aria-label={`Delete ${grant.grant_name}`}
                      style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                    >
                      Delete
                    </button>
                  </div>

                  {grant.notes && (
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--color-sage)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      lineHeight: '1.6',
                      marginTop: '0.75rem',
                    }}>
                      {grant.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
