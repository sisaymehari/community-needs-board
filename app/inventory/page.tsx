'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Category = 'food' | 'clothing' | 'equipment' | 'other'

type InventoryItemRow = {
  id: string
  item_name: string
  category: Category
  quantity: number
  notes: string | null
  available_to_share: boolean
  created_at: string
  updated_at: string
}

type MatchingNeed = {
  id: string
  category: Category
  organisations: { name: string } | null
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

export default function InventoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null)
  const [items, setItems] = useState<InventoryItemRow[]>([])
  const [form, setForm] = useState({ item_name: '', category: 'food' as Category, quantity: '1', notes: '', available_to_share: false })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [matchingNeeds, setMatchingNeeds] = useState<MatchingNeed[]>([])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?message=Please+log+in+to+view+your+inventory.')
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
        .from('inventory_items')
        .select('id, item_name, category, quantity, notes, available_to_share, created_at, updated_at')
        .eq('organisation_id', orgData.id)
        .order('category', { ascending: true })
        .order('item_name', { ascending: true })

      const loadedItems = (data as InventoryItemRow[]) ?? []
      setItems(loadedItems)
      setLoading(false)

      const sharedCategories = [...new Set(
        loadedItems.filter(i => i.available_to_share).map(i => i.category)
      )]

      if (sharedCategories.length > 0) {
        const { data: needsData } = await supabase
          .from('needs')
          .select('id, category, organisations(name)')
          .eq('is_fulfilled', false)
          .neq('organisation_id', orgData.id)
          .in('category', sharedCategories)

        setMatchingNeeds((needsData as unknown as MatchingNeed[]) ?? [])
      }
    }

    load()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setForm(prev => ({ ...prev, [name]: checked }))
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.item_name.trim()) errors.item_name = 'Item name is required.'
    if (form.quantity.trim() === '' || isNaN(Number(form.quantity)) || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)
      errors.quantity = 'Please enter a whole number of 0 or more.'
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
        item_name: form.item_name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        notes: form.notes.trim() || null,
        available_to_share: form.available_to_share,
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(payload)
        .select('id, item_name, category, quantity, notes, available_to_share, created_at, updated_at')
        .single()

      if (error) throw error

      setItems(prev => [...prev, data as InventoryItemRow])
      setForm({ item_name: '', category: 'food', quantity: '1', notes: '', available_to_share: false })
      setFieldErrors({})
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const adjustQuantity = async (item: InventoryItemRow, delta: number) => {
    const nextQuantity = item.quantity + delta
    if (nextQuantity < 0) return
    await updateQuantity(item, nextQuantity)
  }

  const updateQuantity = async (item: InventoryItemRow, nextQuantity: number) => {
    if (nextQuantity < 0 || !Number.isInteger(nextQuantity)) return
    if (nextQuantity === item.quantity) return

    setPendingIds(prev => new Set(prev).add(item.id))
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, quantity: nextQuantity } : i)))

    const { data, error } = await supabase
      .from('inventory_items')
      .update({ quantity: nextQuantity })
      .eq('id', item.id)
      .select('id, item_name, category, quantity, notes, created_at, updated_at')
      .single()

    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })

    if (error) {
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
      return
    }

    setItems(prev => prev.map(i => (i.id === item.id ? (data as InventoryItemRow) : i)))
  }

  const toggleShare = async (item: InventoryItemRow) => {
    const nextValue = !item.available_to_share

    setPendingIds(prev => new Set(prev).add(item.id))
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, available_to_share: nextValue } : i)))

    const { data, error } = await supabase
      .from('inventory_items')
      .update({ available_to_share: nextValue })
      .eq('id', item.id)
      .select('id, item_name, category, quantity, notes, available_to_share, created_at, updated_at')
      .single()

    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })

    if (error) {
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
      return
    }

    setItems(prev => prev.map(i => (i.id === item.id ? (data as InventoryItemRow) : i)))
  }

  const deleteItem = async (item: InventoryItemRow) => {
    setPendingIds(prev => new Set(prev).add(item.id))
    const previousItems = items
    setItems(prev => prev.filter(i => i.id !== item.id))

    const { error } = await supabase.from('inventory_items').delete().eq('id', item.id)

    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })

    if (error) {
      setItems(previousItems)
    }
  }

  if (loading) return null

  const groupedItems = CATEGORIES.map(category => ({
    category,
    items: items.filter(i => i.category === category),
  })).filter(group => group.items.length > 0)

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
        Inventory
      </h1>
      <p style={{
        color: 'var(--color-sage)',
        fontSize: '13px',
        marginBottom: '2.5rem',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        Stock on hand for{' '}
        <span style={{ fontWeight: '600', color: 'var(--color-green)' }}>{org?.name}</span>
      </p>

      {/* Add an item */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={monoLabel}>Add an Item</h2>

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
              <label htmlFor="item_name" style={labelStyle}>
                Item name
              </label>
              <input
                id="item_name"
                name="item_name"
                className={`form-input${fieldErrors.item_name ? ' form-input--error' : ''}`}
                value={form.item_name}
                onChange={handleChange}
                placeholder="e.g. Tinned soup"
                aria-invalid={fieldErrors.item_name ? true : undefined}
                aria-describedby={fieldErrors.item_name ? 'item_name-error' : undefined}
              />
              {fieldErrors.item_name && (
                <p id="item_name-error" role="alert" style={fieldErrorStyle}>{fieldErrors.item_name}</p>
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
                  Quantity
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="1"
                  min="0"
                  className={`form-input${fieldErrors.quantity ? ' form-input--error' : ''}`}
                  value={form.quantity}
                  onChange={handleChange}
                  aria-invalid={fieldErrors.quantity ? true : undefined}
                  aria-describedby={fieldErrors.quantity ? 'quantity-error' : undefined}
                />
              </div>
            </div>
            {fieldErrors.quantity && (
              <p id="quantity-error" role="alert" style={{ ...fieldErrorStyle, marginTop: '-0.7rem' }}>{fieldErrors.quantity}</p>
            )}

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
                placeholder="e.g. Stored in the back cupboard"
              />
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.5rem 0',
              fontSize: '13.5px',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                name="available_to_share"
                checked={form.available_to_share}
                onChange={handleCheckboxChange}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-green)', flexShrink: 0 }}
              />
              Available to share with other charities
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: 'auto', alignSelf: 'flex-start' }}
            >
              {submitting && <span className="spinner-white" />}
              {submitting ? 'Adding…' : 'Add item'}
            </button>

          </div>
        </form>
      </section>

      {matchingNeeds.length > 0 && (
        <div style={{
          background: 'var(--color-green-light)',
          border: '1px solid var(--color-green)',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          fontSize: '13.5px',
          color: 'var(--color-ink)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          lineHeight: '1.6',
        }}>
          <strong style={{ color: 'var(--color-green)' }}>Someone could use what you have to share:</strong>{' '}
          {Array.from(new Set(matchingNeeds.map(n => n.organisations?.name).filter(Boolean))).join(', ')}{' '}
          {matchingNeeds.length === 1 ? 'has' : 'have'} an open need matching a category you marked as shareable.{' '}
          <a href="/matches" className="text-link" style={{ color: 'var(--color-green)', fontWeight: 600, textDecoration: 'none' }}>
            See matches →
          </a>
        </div>
      )}

      {/* Current stock */}
      <section>
        <h2 style={monoLabel}>Current Stock</h2>

        {items.length === 0 ? (
          <div style={{
            padding: '3rem 1.5rem',
            border: '1px dashed var(--color-border)',
            borderRadius: '10px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem', lineHeight: 1 }}>📦</p>
            <p style={{
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--color-ink)',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            }}>
              No items in stock yet
            </p>
            <p style={{
              fontSize: '14px',
              color: 'var(--color-sage)',
              lineHeight: '1.7',
              maxWidth: '340px',
              margin: '0 auto',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              Use the form above to log what you have on hand.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {groupedItems.map(group => (
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
                    ({group.items.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {group.items.map(item => {
                    const isPending = pendingIds.has(item.id)
                    return (
                      <div key={item.id} style={{
                        position: 'relative',
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
                        <span aria-hidden="true" className={`pin-dot ${item.available_to_share ? 'pin-dot--green' : 'pin-dot--sage'}`} />

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '14.5px',
                            fontWeight: '600',
                            color: 'var(--color-ink)',
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {item.item_name}
                          </div>
                          {item.notes && (
                            <div style={{
                              fontSize: '13px',
                              color: 'var(--color-sage)',
                              fontFamily: 'var(--font-inter), system-ui, sans-serif',
                              marginTop: '2px',
                            }}>
                              {item.notes}
                            </div>
                          )}
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '5px',
                            padding: '0.4rem 0',
                            fontSize: '12px',
                            color: item.available_to_share ? 'var(--color-green)' : 'var(--color-sage)',
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            cursor: 'pointer',
                            width: 'fit-content',
                          }}>
                            <input
                              type="checkbox"
                              checked={item.available_to_share}
                              disabled={isPending}
                              onChange={() => toggleShare(item)}
                              style={{ width: '14px', height: '14px', accentColor: 'var(--color-green)', flexShrink: 0 }}
                            />
                            Available to share
                          </label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={() => adjustQuantity(item, -1)}
                            disabled={isPending || item.quantity <= 0}
                            aria-label={`Decrease quantity of ${item.item_name}`}
                            style={{ fontWeight: 600 }}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity}
                            disabled={isPending}
                            onChange={e => {
                              const val = e.target.value
                              if (val === '') return
                              const num = Number(val)
                              if (!isNaN(num)) updateQuantity(item, Math.max(0, Math.trunc(num)))
                            }}
                            aria-label={`Quantity of ${item.item_name}`}
                            style={{
                              width: '52px',
                              minHeight: '40px',
                              textAlign: 'center',
                              padding: '0.35rem 0.3rem',
                              border: '1px solid var(--color-border)',
                              borderRadius: '7px',
                              fontSize: '14px',
                              fontFamily: 'var(--font-ibm-plex-mono), monospace',
                              color: 'var(--color-ink)',
                              boxSizing: 'border-box',
                            }}
                          />
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={() => adjustQuantity(item, 1)}
                            disabled={isPending}
                            aria-label={`Increase quantity of ${item.item_name}`}
                            style={{ fontWeight: 600 }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={() => deleteItem(item)}
                            disabled={isPending}
                            aria-label={`Delete ${item.item_name}`}
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
