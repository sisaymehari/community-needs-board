'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DashGrant = {
  id: string
  grant_name: string
  funder: string | null
  amount: number | null
  deadline: string
  status: 'planned' | 'submitted' | 'awarded' | 'rejected'
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

export default function DashGrantSection({ orgId }: { orgId: string }) {
  const [grants, setGrants] = useState<DashGrant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('grants')
        .select('id, grant_name, funder, amount, deadline, status')
        .eq('organisation_id', orgId)
        .gte('deadline', new Date().toISOString().slice(0, 10))
        .not('status', 'in', '(awarded,rejected)')
        .order('deadline', { ascending: true })
        .limit(3)

      setGrants((data as DashGrant[]) ?? [])
      setLoading(false)
    }

    load()
  }, [orgId])

  if (loading) return null

  return (
    <section style={{
      marginTop: '3rem',
      paddingTop: '3rem',
      borderTop: '1px solid var(--color-border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={sectionHeading}>Upcoming Grant Deadlines</h2>
        <a href="/grants" style={{
          fontSize: '13px',
          color: 'var(--color-green)',
          textDecoration: 'none',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontWeight: '500',
        }}>
          View all →
        </a>
      </div>

      {grants.length === 0 ? (
        <p style={{
          color: 'var(--color-sage)',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          No upcoming deadlines.{' '}
          <a href="/grants" style={{ color: 'var(--color-green)', textDecoration: 'none' }}>
            Track a grant →
          </a>
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {grants.map(grant => {
            const days = daysUntil(grant.deadline)
            const isUpcoming = days <= 14
            return (
              <div key={grant.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.8rem 1.1rem',
                border: `1px solid ${isUpcoming ? 'var(--color-marigold)' : 'var(--color-border)'}`,
                borderRadius: '9px',
                background: isUpcoming ? 'var(--color-marigold-bg)' : '#fff',
              }}>
                <span style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13.5px',
                  fontWeight: '500',
                  color: 'var(--color-ink)',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {grant.grant_name}
                  {grant.funder && (
                    <span style={{ color: 'var(--color-sage)', fontWeight: 400 }}> · {grant.funder}</span>
                  )}
                </span>

                {grant.amount != null && (
                  <span style={{
                    fontFamily: 'var(--font-ibm-plex-mono), monospace',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--color-ink)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {formatCurrency(grant.amount)}
                  </span>
                )}

                <span style={{
                  ...monoSm,
                  color: isUpcoming ? 'var(--color-marigold)' : 'var(--color-sage)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>
                  {new Date(grant.deadline).toLocaleDateString('en-GB')}
                  {isUpcoming && ` · ${days === 0 ? 'today' : days === 1 ? '1 day' : `${days} days`}`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
