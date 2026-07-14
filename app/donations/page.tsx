'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type DonationType = 'money' | 'goods'

type DonationRow = {
  id: string
  type: DonationType
  amount: number | null
  item_description: string | null
  donor_name: string | null
  notes: string | null
  created_at: string
}

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
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

export default function DonationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null)
  const [donations, setDonations] = useState<DonationRow[]>([])
  const [donationType, setDonationType] = useState<DonationType>('money')
  const [form, setForm] = useState({ amount: '', item_description: '', donor_name: '', notes: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?message=Please+log+in+to+view+your+donations.')
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
        .from('donations')
        .select('id, type, amount, item_description, donor_name, notes, created_at')
        .eq('organisation_id', orgData.id)
        .order('created_at', { ascending: false })

      setDonations((data as DonationRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const totalMoney = donations
    .filter(d => d.type === 'money' && d.amount != null)
    .reduce((sum, d) => sum + (d.amount ?? 0), 0)

  const moneyCount = donations.filter(d => d.type === 'money').length

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (donationType === 'money') {
      if (!form.amount.trim()) errors.amount = 'Amount is required.'
      else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
        errors.amount = 'Please enter a valid amount greater than £0.'
    } else {
      if (!form.item_description.trim())
        errors.item_description = 'Please describe what was donated.'
    }
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
      const payload: Record<string, unknown> = {
        organisation_id: org.id,
        type: donationType,
        donor_name: form.donor_name.trim() || null,
        notes: form.notes.trim() || null,
      }
      if (donationType === 'money') {
        payload.amount = Number(form.amount)
      } else {
        payload.item_description = form.item_description.trim()
      }

      const { data, error } = await supabase
        .from('donations')
        .insert(payload)
        .select('id, type, amount, item_description, donor_name, notes, created_at')
        .single()

      if (error) throw error

      setDonations(prev => [data as DonationRow, ...prev])
      setForm({ amount: '', item_description: '', donor_name: '', notes: '' })
      setFieldErrors({})
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <main className="page-wrap" style={{ maxWidth: '680px', margin: '0 auto' }}>
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
        fontSize: 'clamp(1.6rem, 3.5vw, 2rem)',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'var(--color-ink)',
        margin: '1.5rem 0 0.35rem',
      }}>
        Donations
      </h1>
      <p style={{
        color: 'var(--color-sage)',
        fontSize: '13px',
        marginBottom: '2rem',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        Tracking for{' '}
        <span style={{ fontWeight: '600', color: 'var(--color-green)' }}>{org?.name}</span>
      </p>

      {/* Running total */}
      <div style={{
        background: 'var(--color-green-light)',
        border: '1px solid var(--color-green)',
        borderRadius: '10px',
        padding: '1.4rem 1.75rem',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            fontSize: '11px',
            fontWeight: '500',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-green)',
            marginBottom: '0.3rem',
            opacity: 0.8,
          }}>
            Total money raised
          </div>
          <div style={{
            fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            fontSize: 'clamp(2rem, 5vw, 2.8rem)',
            fontWeight: '700',
            letterSpacing: '-0.03em',
            color: 'var(--color-green)',
            lineHeight: 1,
          }}>
            {formatCurrency(totalMoney)}
          </div>
        </div>
        {moneyCount > 0 && (
          <div style={{
            fontSize: '13px',
            color: 'var(--color-sage)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            paddingBottom: '3px',
          }}>
            from {moneyCount} {moneyCount === 1 ? 'monetary donation' : 'monetary donations'}
          </div>
        )}
      </div>

      {/* Log a donation */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={monoLabel}>Log a Donation</h2>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {(['money', 'goods'] as DonationType[]).map(t => {
            const active = donationType === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setDonationType(t); setFieldErrors({}) }}
                style={{
                  flex: 1,
                  padding: '0.8rem 1rem',
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
                }}>
                  {t === 'money' ? '💷  Money' : '📦  Goods'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--color-sage)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  marginTop: '2px',
                }}>
                  {t === 'money' ? 'Cash or bank transfer' : 'In-kind donation'}
                </div>
              </button>
            )
          })}
        </div>

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

            {donationType === 'money' ? (
              <div>
                <label htmlFor="amount" style={labelStyle}>
                  Amount (£)
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
                  placeholder="e.g. 250.00"
                  aria-invalid={fieldErrors.amount ? true : undefined}
                  aria-describedby={fieldErrors.amount ? 'amount-error' : undefined}
                />
                {fieldErrors.amount && (
                  <p id="amount-error" role="alert" style={fieldErrorStyle}>{fieldErrors.amount}</p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="item_description" style={labelStyle}>
                  What was donated?
                </label>
                <input
                  id="item_description"
                  name="item_description"
                  className={`form-input${fieldErrors.item_description ? ' form-input--error' : ''}`}
                  value={form.item_description}
                  onChange={handleChange}
                  placeholder="e.g. 20 tins of soup, winter coats (size M–XL)"
                  aria-invalid={fieldErrors.item_description ? true : undefined}
                  aria-describedby={fieldErrors.item_description ? 'item-error' : undefined}
                />
                {fieldErrors.item_description && (
                  <p id="item-error" role="alert" style={fieldErrorStyle}>{fieldErrors.item_description}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="donor_name" style={labelStyle}>
                Donor name{' '}
                <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="donor_name"
                name="donor_name"
                className="form-input"
                value={form.donor_name}
                onChange={handleChange}
                placeholder="Anonymous"
              />
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
                placeholder="e.g. Collected at the Christmas market"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: 'auto', alignSelf: 'flex-start' }}
            >
              {submitting && <span className="spinner-white" />}
              {submitting ? 'Saving…' : 'Log donation'}
            </button>

          </div>
        </form>
      </section>

      {/* Donation history */}
      <section>
        <h2 style={monoLabel}>Donation History</h2>

        {donations.length === 0 ? (
          <p style={{
            color: 'var(--color-sage)',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            padding: '1.5rem 0',
          }}>
            No donations logged yet. Use the form above to record your first one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '8px' }}>
            {donations.map(d => (
              <div key={d.id} style={{
                position: 'relative',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                padding: '1.25rem 1.5rem 1.1rem',
                background: '#fff',
              }}>
                {/* Pin: marigold for money, green for goods */}
                <span aria-hidden="true" style={{
                  position: 'absolute',
                  top: '-5px',
                  left: '20px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: d.type === 'money' ? 'var(--color-marigold)' : 'var(--color-green)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.18), 0 0 0 2px var(--color-bg)',
                  display: 'block',
                }} />

                {/* Header row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: (d.type === 'goods' && d.item_description) || d.donor_name || d.notes ? '0.6rem' : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      ...monoSm,
                      background: d.type === 'money' ? 'var(--color-marigold-bg)' : 'var(--color-green-light)',
                      color: d.type === 'money' ? 'var(--color-marigold)' : 'var(--color-green)',
                      padding: '2px 9px',
                      borderRadius: '100px',
                      textTransform: 'capitalize',
                    }}>
                      {d.type}
                    </span>
                    {d.type === 'money' && d.amount != null && (
                      <span style={{
                        fontFamily: 'var(--font-ibm-plex-mono), monospace',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: 'var(--color-ink)',
                        letterSpacing: '-0.01em',
                      }}>
                        {formatCurrency(d.amount)}
                      </span>
                    )}
                  </div>
                  <span style={{ ...monoSm, color: 'var(--color-sage)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {new Date(d.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>

                {/* Goods description */}
                {d.type === 'goods' && d.item_description && (
                  <p style={{
                    fontSize: '14.5px',
                    color: 'var(--color-ink)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    lineHeight: '1.55',
                    marginBottom: d.donor_name || d.notes ? '0.5rem' : 0,
                  }}>
                    {d.item_description}
                  </p>
                )}

                {/* Donor / notes */}
                {(d.donor_name || d.notes) && (
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--color-sage)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    lineHeight: '1.6',
                  }}>
                    {d.donor_name && (
                      <span>
                        From:{' '}
                        <strong style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                          {d.donor_name}
                        </strong>
                      </span>
                    )}
                    {d.donor_name && d.notes && (
                      <span style={{ color: 'var(--color-border)', margin: '0 6px' }}>·</span>
                    )}
                    {d.notes && <span>{d.notes}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
