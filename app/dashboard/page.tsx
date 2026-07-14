'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashEventSection from '@/app/components/DashEventSection'
import DashGrantSection from '@/app/components/DashGrantSection'
import DashReportSection from '@/app/components/DashReportSection'

// ── Local types ──────────────────────────────────────────────────────────────

type DashNeed = {
  id: string
  description: string
  category: string
  is_urgent: boolean
  created_at: string
}

type DashDonation = {
  id: string
  type: 'money' | 'goods'
  amount: number | null
  item_description: string | null
  donor_name: string | null
  created_at: string
}

type DashOffer = {
  id: string
  name: string
  message: string | null
  created_at: string
  needs: { description: string } | null
}

// ── Shared style constants ───────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  volunteers: '🙋',
  food: '🍎',
  clothing: '👕',
  equipment: '🔧',
  skills: '💡',
}

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
}

const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11.5px',
  fontWeight: '500',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-sage)',
  margin: 0,
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '1.1rem 1.25rem 1.3rem',
      background: '#fff',
    }}>
      <div style={{
        fontFamily: 'var(--font-ibm-plex-mono), monospace',
        fontSize: '10.5px',
        fontWeight: '500',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'var(--color-sage)',
        marginBottom: '0.55rem',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: 'clamp(1.4rem, 3vw, 1.75rem)',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: accent ? 'var(--color-green)' : 'var(--color-ink)',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
    </div>
  )
}

function DashNeedCard({
  need,
  onFulfilled,
}: {
  need: DashNeed
  onFulfilled: (id: string) => void
}) {
  const [fulfilling, setFulfilling] = useState(false)
  const [error, setError] = useState('')
  const [generatingPost, setGeneratingPost] = useState(false)
  const [postText, setPostText] = useState('')
  const [postError, setPostError] = useState('')
  const [postCopied, setPostCopied] = useState(false)

  const handleFulfill = async () => {
    setFulfilling(true)
    setError('')
    const { data, error: err } = await supabase
      .from('needs')
      .update({ is_fulfilled: true })
      .eq('id', need.id)
      .select('id')

    if (err || !data || data.length === 0) {
      setError("Couldn't mark as fulfilled.")
    } else {
      onFulfilled(need.id)
    }
    setFulfilling(false)
  }

  const handleGeneratePost = async () => {
    setGeneratingPost(true)
    setPostError('')
    setPostCopied(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setPostError('Your session has expired. Please log in again.')
        return
      }

      const res = await fetch('/api/generate-social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session.user.id, need_id: need.id }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setPostError(body.error ?? 'Something went wrong generating the post. Please try again.')
        return
      }

      const data = await res.json()
      setPostText(data.post ?? '')
    } catch {
      setPostError('Something went wrong generating the post. Please try again.')
    } finally {
      setGeneratingPost(false)
    }
  }

  const handleCopyPost = async () => {
    try {
      await navigator.clipboard.writeText(postText)
      setPostCopied(true)
      setTimeout(() => setPostCopied(false), 2000)
    } catch {
      setPostError('Could not copy to clipboard.')
    }
  }

  return (
    <div style={{
      position: 'relative',
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '1.25rem 1.5rem 1.1rem',
      background: '#fff',
    }}>
      {/* Pin */}
      <span aria-hidden="true" style={{
        position: 'absolute',
        top: '-5px',
        left: '20px',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: need.is_urgent ? 'var(--color-marigold)' : 'var(--color-green)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.18), 0 0 0 2px var(--color-bg)',
        display: 'block',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
            {CATEGORY_ICONS[need.category] || '📌'}
          </span>
          <span style={{
            ...monoSm,
            background: 'var(--color-green-light)',
            color: 'var(--color-green)',
            padding: '2px 9px',
            borderRadius: '100px',
            textTransform: 'capitalize',
          }}>
            {need.category}
          </span>
          {need.is_urgent && (
            <span style={{
              ...monoSm,
              background: 'var(--color-marigold-bg)',
              color: 'var(--color-marigold)',
              padding: '2px 9px',
              borderRadius: '100px',
            }}>
              urgent
            </span>
          )}
        </div>
        <span style={{ ...monoSm, color: 'var(--color-sage)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
          {new Date(need.created_at).toLocaleDateString('en-GB')}
        </span>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '15px',
        color: 'var(--color-ink)',
        lineHeight: '1.65',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginBottom: '0.9rem',
      }}>
        {need.description}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleFulfill}
          disabled={fulfilling}
          className="card-action-btn"
          style={{ cursor: fulfilling ? 'not-allowed' : undefined }}
        >
          {fulfilling && <span className="spinner-grey" style={{ marginRight: '5px' }} />}
          {fulfilling ? 'Saving…' : 'Mark as fulfilled'}
        </button>

        <button
          onClick={handleGeneratePost}
          disabled={generatingPost}
          className="card-action-btn"
          style={{ cursor: generatingPost ? 'not-allowed' : undefined }}
        >
          {generatingPost && <span className="spinner-grey" style={{ marginRight: '5px' }} />}
          {generatingPost ? 'Generating…' : postText ? 'Regenerate social post' : 'Generate social post'}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '0.4rem' }}>
          {error}
        </p>
      )}

      {postError && (
        <p role="alert" style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '0.4rem' }}>
          {postError}
        </p>
      )}

      {postText && (
        <div style={{
          marginTop: '0.9rem',
          border: '1px solid var(--color-green)',
          background: 'var(--color-green-light)',
          borderRadius: '8px',
          padding: '0.9rem 1rem',
        }}>
          <p style={{
            fontSize: '13.5px',
            color: 'var(--color-ink)',
            lineHeight: '1.55',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            whiteSpace: 'pre-wrap',
            margin: '0 0 0.6rem',
          }}>
            {postText}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              ...monoSm,
              color: postText.length > 280 ? 'var(--color-error)' : 'var(--color-sage)',
            }}>
              {postText.length} / 280 characters
            </span>
            <button onClick={handleCopyPost} className="card-action-btn">
              {postCopied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null)
  const [openNeeds, setOpenNeeds] = useState<DashNeed[]>([])
  const [fulfilledCount, setFulfilledCount] = useState(0)
  const [totalMoney, setTotalMoney] = useState(0)
  const [totalOffersCount, setTotalOffersCount] = useState(0)
  const [recentDonations, setRecentDonations] = useState<DashDonation[]>([])
  const [recentOffers, setRecentOffers] = useState<DashOffer[]>([])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?message=Please+log+in+to+view+your+dashboard.')
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

      const [
        openNeedsRes,
        fulfilledRes,
        recentDonationsRes,
        moneyRes,
        recentOffersRes,
        totalOffersRes,
      ] = await Promise.all([
        supabase
          .from('needs')
          .select('id, description, category, is_urgent, created_at')
          .eq('organisation_id', orgData.id)
          .eq('is_fulfilled', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('needs')
          .select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgData.id)
          .eq('is_fulfilled', true),
        supabase
          .from('donations')
          .select('id, type, amount, item_description, donor_name, created_at')
          .eq('organisation_id', orgData.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('donations')
          .select('amount')
          .eq('organisation_id', orgData.id)
          .eq('type', 'money'),
        supabase
          .from('offers')
          .select('id, name, message, created_at, needs(description)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('offers')
          .select('id', { count: 'exact', head: true }),
      ])

      setOpenNeeds((openNeedsRes.data as DashNeed[]) ?? [])
      setFulfilledCount(fulfilledRes.count ?? 0)
      setRecentDonations((recentDonationsRes.data as DashDonation[]) ?? [])
      setTotalMoney(
        (moneyRes.data ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0)
      )
      setRecentOffers((recentOffersRes.data as unknown as DashOffer[]) ?? [])
      setTotalOffersCount(totalOffersRes.count ?? 0)
      setLoading(false)
    }

    load()
  }, [router])

  const handleFulfilled = (id: string) => {
    setOpenNeeds(prev => prev.filter(n => n.id !== id))
    setFulfilledCount(prev => prev + 1)
  }

  if (loading) return null

  return (
    <main className="page-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>

      {/* ── Welcome header ─────────────────────────────────────────── */}
      <div style={{
        paddingBottom: '2rem',
        marginBottom: '2.5rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <p style={{
          fontFamily: 'var(--font-ibm-plex-mono), monospace',
          fontSize: '11px',
          fontWeight: '500',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--color-sage)',
          marginBottom: '0.4rem',
        }}>
          Organisation Dashboard
        </p>
        <h1 style={{
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
          fontSize: 'clamp(1.7rem, 4vw, 2.2rem)',
          fontWeight: '700',
          letterSpacing: '-0.02em',
          color: 'var(--color-ink)',
          margin: 0,
        }}>
          {org?.name}
        </h1>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
        gap: '1rem',
        marginBottom: '3rem',
      }}>
        <StatCard label="Open Needs" value={openNeeds.length} />
        <StatCard label="Fulfilled" value={fulfilledCount} accent />
        <StatCard label="Money Raised" value={formatCurrency(totalMoney)} accent />
        <StatCard label="Offers Received" value={totalOffersCount} />
      </div>

      {/* ── Open needs ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={sectionHeading}>
            Open Needs{openNeeds.length > 0 ? ` (${openNeeds.length})` : ''}
          </h2>
          <a href="/post" style={{
            fontSize: '13px',
            color: 'var(--color-green)',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontWeight: '500',
          }}>
            + Post a need
          </a>
        </div>

        {openNeeds.length === 0 ? (
          <div style={{
            padding: '2rem 1.5rem',
            border: '1px dashed var(--color-border)',
            borderRadius: '10px',
            textAlign: 'center',
          }}>
            <p style={{
              color: 'var(--color-sage)',
              fontSize: '14px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              marginBottom: '1rem',
            }}>
              No open needs right now.
            </p>
            <a href="/post" style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--color-green)',
              color: '#fff',
              padding: '0.55rem 1.1rem',
              borderRadius: '7px',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: '500',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              Post a need
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', paddingTop: '8px' }}>
            {openNeeds.map(need => (
              <DashNeedCard key={need.id} need={need} onFulfilled={handleFulfilled} />
            ))}
          </div>
        )}
      </section>

      {/* ── Recent donations ───────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={sectionHeading}>Recent Donations</h2>
          <a href="/donations" style={{
            fontSize: '13px',
            color: 'var(--color-green)',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontWeight: '500',
          }}>
            View all →
          </a>
        </div>

        {recentDonations.length === 0 ? (
          <p style={{
            color: 'var(--color-sage)',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            No donations logged yet.{' '}
            <a href="/donations" style={{ color: 'var(--color-green)', textDecoration: 'none' }}>
              Start tracking →
            </a>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentDonations.map(d => (
              <div key={d.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.8rem 1.1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '9px',
                background: '#fff',
              }}>
                <span style={{
                  ...monoSm,
                  background: d.type === 'money' ? 'var(--color-marigold-bg)' : 'var(--color-green-light)',
                  color: d.type === 'money' ? 'var(--color-marigold)' : 'var(--color-green)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  flexShrink: 0,
                  textTransform: 'capitalize',
                }}>
                  {d.type}
                </span>

                <span style={{
                  fontFamily: d.type === 'money'
                    ? 'var(--font-ibm-plex-mono), monospace'
                    : 'var(--font-inter), system-ui, sans-serif',
                  fontSize: d.type === 'money' ? '14px' : '13.5px',
                  fontWeight: d.type === 'money' ? '600' : '400',
                  color: 'var(--color-ink)',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {d.type === 'money' && d.amount != null
                    ? formatCurrency(d.amount)
                    : d.item_description}
                </span>

                {d.donor_name && (
                  <span style={{
                    fontSize: '12.5px',
                    color: 'var(--color-sage)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {d.donor_name}
                  </span>
                )}

                <span style={{ ...monoSm, color: 'var(--color-sage)', flexShrink: 0 }}>
                  {new Date(d.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent offers ──────────────────────────────────────────── */}
      <section style={{ marginBottom: '0' }}>
        <h2 style={{ ...sectionHeading, marginBottom: '1.25rem' }}>
          Recent Offers{totalOffersCount > 5 ? ` (${totalOffersCount} total)` : ''}
        </h2>

        {recentOffers.length === 0 ? (
          <p style={{
            color: 'var(--color-sage)',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            No one has offered to help yet — share your needs on the board.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentOffers.map(offer => {
              const desc = offer.needs?.description ?? ''
              const preview = desc.length > 72 ? desc.slice(0, 69) + '…' : desc
              return (
                <div key={offer.id} style={{
                  padding: '0.9rem 1.1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '9px',
                  background: '#fff',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: preview ? '0.2rem' : 0 }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    }}>
                      {offer.name}
                    </span>
                    <span style={{ ...monoSm, color: 'var(--color-sage)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {new Date(offer.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>

                  {preview && (
                    <p style={{
                      fontSize: '12.5px',
                      color: 'var(--color-sage)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      margin: 0,
                    }}>
                      Re: {preview}
                    </p>
                  )}

                  {offer.message && (
                    <p style={{
                      fontSize: '13.5px',
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      lineHeight: '1.55',
                      margin: '0.45rem 0 0',
                      fontStyle: 'italic',
                    }}>
                      "{offer.message}"
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Events ─────────────────────────────────────────────────── */}
      {org && <DashEventSection orgId={org.id} />}

      {/* ── Grant deadlines ────────────────────────────────────────── */}
      {org && <DashGrantSection orgId={org.id} />}

      {/* ── Impact report ──────────────────────────────────────────── */}
      {org && <DashReportSection orgId={org.id} />}

    </main>
  )
}
