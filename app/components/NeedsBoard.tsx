'use client'

import { useState } from 'react'
import type { Need } from '@/lib/types'
import NeedCard from '@/app/components/NeedCard'

const CATEGORIES = ['all', 'volunteers', 'food', 'clothing', 'equipment', 'skills']

export default function NeedsBoard({ initialNeeds }: { initialNeeds: Need[] }) {
  const [needs, setNeeds] = useState(initialNeeds)
  const [activeCategory, setActiveCategory] = useState('all')

  const handleFulfilled = (id: string) => {
    setNeeds(prev => prev.filter(need => need.id !== id))
  }

  const filteredNeeds = activeCategory === 'all'
    ? needs
    : needs.filter(need => need.category === activeCategory)

  const filters = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
      {CATEGORIES.map(category => {
        const isActive = category === activeCategory
        return (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className="filter-btn"
            style={{
              fontSize: '13px',
              fontWeight: '500',
              padding: '0.4rem 0.9rem',
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'capitalize',
              background: isActive ? '#1D6A48' : '#f3f4f6',
              color: isActive ? '#fff' : '#6b7280',
            }}
          >
            {category}
          </button>
        )
      })}
    </div>
  )

  return (
    <>
      {filters}
      {needs.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No needs posted yet. Be the first to post one.</p>
      ) : filteredNeeds.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No needs in this category right now.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredNeeds.map((need) => (
            <NeedCard key={need.id} need={need} onFulfilled={handleFulfilled} />
          ))}
        </div>
      )}
    </>
  )
}
