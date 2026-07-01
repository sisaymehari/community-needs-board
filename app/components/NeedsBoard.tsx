'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Need } from '@/lib/types'

const CATEGORY_ICONS: Record<string, string> = {
  volunteers: '🙋',
  food: '🍎',
  clothing: '👕',
  equipment: '🔧',
  skills: '💡',
}

export default function NeedsBoard({ initialNeeds }: { initialNeeds: Need[] }) {
  const [needs, setNeeds] = useState(initialNeeds)
  const [fulfillingId, setFulfillingId] = useState<string | null>(null)

  const handleFulfill = async (id: string) => {
    setFulfillingId(id)
    const { error } = await supabase
      .from('needs')
      .update({ is_fulfilled: true })
      .eq('id', id)

    if (!error) {
      setNeeds(prev => prev.filter(need => need.id !== id))
    }
    setFulfillingId(null)
  }

  if (needs.length === 0) {
    return <p style={{ color: '#9ca3af' }}>No needs posted yet. Be the first to post one.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {needs.map((need) => (
        <div
          key={need.id}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            borderLeft: need.is_urgent ? '4px solid #ef4444' : '4px solid #1D6A48',
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {CATEGORY_ICONS[need.category] || '📌'}
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                background: '#f3f4f6',
                padding: '2px 10px',
                borderRadius: '100px',
                textTransform: 'capitalize',
              }}>
                {need.category}
              </span>
              {need.is_urgent && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  background: '#fef2f2',
                  color: '#ef4444',
                  padding: '2px 10px',
                  borderRadius: '100px',
                }}>
                  Urgent
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {new Date(need.created_at).toLocaleDateString('en-GB')}
            </span>
          </div>

          <p style={{ fontSize: '15px', color: '#111827', marginBottom: '0.75rem', lineHeight: '1.6' }}>
            {need.description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {need.organisations?.name} · {need.organisations?.location}
            </div>
            <button
              onClick={() => handleFulfill(need.id)}
              disabled={fulfillingId === need.id}
              style={{
                fontSize: '12px',
                color: '#9ca3af',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: fulfillingId === need.id ? 'not-allowed' : 'pointer',
              }}
            >
              {fulfillingId === need.id ? 'Updating...' : 'Mark as fulfilled'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
