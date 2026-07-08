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

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`filter-pill${category === activeCategory ? ' filter-pill--active' : ''}`}
          >
            {category}
          </button>
        ))}
      </div>

      {needs.length === 0 ? (
        <p style={{ color: 'var(--color-sage)', fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px' }}>
          No needs posted yet. Be the first to post one.
        </p>
      ) : filteredNeeds.length === 0 ? (
        <p style={{ color: 'var(--color-sage)', fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px' }}>
          No needs in this category right now.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '8px' }}>
          {filteredNeeds.map((need) => (
            <NeedCard key={need.id} need={need} onFulfilled={handleFulfilled} />
          ))}
        </div>
      )}
    </>
  )
}
