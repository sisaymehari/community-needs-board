'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Category = 'food' | 'clothing' | 'equipment' | 'other'

type BusinessOfferRow = {
  id: string
  item_description: string
  category: Category
  quantity: string | null
  available: boolean
  created_at: string
}

const CATEGORIES: Category[] = ['food', 'clothing', 'equipment', 'other']

const CATEGORY_LABEL: Record<Category, string> = {
  food: 'Food',
  clothing: 'Clothing',
  equipment: 'Equipment',
  other: 'Other',
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

export default function BusinessOffersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<{ id: string; name: string } | null>(null)
  const [offers, setOffers] = useState<BusinessOfferRow[]>([])
  const [form, setForm] = useState({ item_description: '', category: 'food' as Category, quantity: '', available: true })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?message=Please+log+in+to+view+your+business+offers.')
        return
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!businessData) {
        router.replace('/')
        return
      }

      setBusiness(businessData)

      const { data } = await supabase
        .from('business_offers')
        .select('id, item_description, category, quantity, available, created_at')
        .eq('business_id', businessData.id)
        .order('category', { ascending: true })
        .order('created_at', { ascending: false })

      setOffers((data as BusinessOfferRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleAvailableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, available: e.target.checked }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.item_description.trim()) errors.item_description = 'Please describe what you’re offering.'
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

    if (!business) return
    setSubmitting(true)

    try {
      const payload = {
        business_id: business.id,
        item_description: form.item_description.trim(),
        category: form.category,
        quantity: form.quantity.trim() || null,
        available: form.available,
      }

      const { data, error } = await supabase
        .from('business_offers')
        .insert(payload)
        .select('id, item_description, category, quantity, available, created_at')
        .single()

      if (error) throw error

      setOffers(prev => [data as BusinessOfferRow, ...prev])
      setForm({ item_description: '', category: 'food', quantity: '', available: true })
      setFieldErrors({})
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAvailable = async (offer: BusinessOfferRow) => {
    const nextValue = !offer.available

    setPendingIds(prev => new Set(prev).add(offer.id))
    setOffers(prev => prev.map(o => (o.id === offer.id ? { ...o, available: nextValue } : o)))

    const { data, error } = await supabase
      .from('business_offers')
      .update({ available: nextValue })
      .eq('id', offer.id)
      .select('id, item_description, category, quantity, available, created_at')
      .single()

    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(offer.id)
      return next
    })

    if (error) {
      setOffers(prev => prev.map(o => (o.id === offer.id ? offer : o)))
      return
    }

    setOffers(prev => prev.map(o => (o.id === offer.id ? (data as BusinessOfferRow) : o)))
  }

  const deleteOffer = async (offer: BusinessOfferRow) => {
    setPendingIds(prev => new Set(prev).add(offer.id))
    const previousOffers = offers
    setOffers(prev => prev.filter(o => o.id !== offer.id))

    const { error } = await supabase.from('business_offers').delete().eq('id', offer.id)

    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(offer.id)
      return next
    })

    if (error) {
      setOffers(previousOffers)
    }
  }

  if (loading) return null

  const groupedOffers = CATEGORIES.map(category => ({
    category,
    offers: offers.filter(o => o.category === category),
  })).filter(group => group.offers.length > 0)

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
        Business Offers
      </h1>
      <p style={{
        color: 'var(--color-sage)',
        fontSize: '13px',
        marginBottom: '2.5rem',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        Surplus stock offered by{' '}
        <span style={{ fontWeight: '600', color: 'var(--color-green)' }}>{business?.name}</span>
        {' '}to local charities.
      </p>

      {/* Add an offer */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={monoLabel}>Post an Offer</h2>

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
              <label htmlFor="item_description" style={labelStyle}>
                What are you offering?
              </label>
              <input
                id="item_description"
                name="item_description"
                className={`form-input${fieldErrors.item_description ? ' form-input--error' : ''}`}
                value={form.item_description}
                onChange={handleChange}
                placeholder="e.g. Surplus bread and pastries"
                aria-invalid={fieldErrors.item_description ? true : undefined}
                aria-describedby={fieldErrors.item_description ? 'item_description-error' : undefined}
              />
              {fieldErrors.item_description && (
                <p id="item_description-error" role="alert" style={fieldErrorStyle}>{fieldErrors.item_description}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1.1rem' }}>
              <div style={{ flex: 2 }}>
                <label htmlFor="category" style={labelStyle}>
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  className="form-input"
                  value={form.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label htmlFor="quantity" style={labelStyle}>
                  Quantity{' '}
                  <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  className="form-input"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="e.g. bulk, 2 pallets"
                />
              </div>
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '13.5px',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={form.available}
                onChange={handleAvailableChange}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-green)' }}
              />
              Currently available
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: 'auto', alignSelf: 'flex-start' }}
            >
              {submitting && <span className="spinner-white" />}
              {submitting ? 'Posting…' : 'Post offer'}
            </button>

          </div>
        </form>
      </section>

      {/* Offer list */}
      <section>
        <h2 style={monoLabel}>Your Offers</h2>

        {offers.length === 0 ? (
          <p style={{
            color: 'var(--color-sage)',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            padding: '1.5rem 0',
          }}>
            No offers posted yet. Use the form above to add your first one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {groupedOffers.map(group => (
              <div key={group.category}>
                <div style={{
                  ...monoSm,
                  color: 'var(--color-green)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.75rem',
                }}>
                  {CATEGORY_LABEL[group.category]}
                  <span style={{ color: 'var(--color-sage)', marginLeft: '6px', fontWeight: 400 }}>
                    ({group.offers.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {group.offers.map(offer => {
                    const isPending = pendingIds.has(offer.id)
                    return (
                      <div key={offer.id} style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '1rem 1.25rem',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        opacity: isPending ? 0.6 : 1,
                        transition: 'opacity 0.12s',
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '14.5px',
                            fontWeight: '600',
                            color: 'var(--color-ink)',
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          }}>
                            {offer.item_description}
                          </div>
                          <div style={{ ...monoSm, color: 'var(--color-sage)', marginTop: '2px' }}>
                            {offer.quantity && <>{offer.quantity} · </>}
                            {new Date(offer.created_at).toLocaleDateString('en-GB')}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            color: offer.available ? 'var(--color-green)' : 'var(--color-sage)',
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            cursor: 'pointer',
                          }}>
                            <input
                              type="checkbox"
                              checked={offer.available}
                              disabled={isPending}
                              onChange={() => toggleAvailable(offer)}
                              style={{ width: '13px', height: '13px', accentColor: 'var(--color-green)' }}
                            />
                            Available
                          </label>
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={() => deleteOffer(offer)}
                            disabled={isPending}
                            aria-label={`Delete ${offer.item_description}`}
                            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
