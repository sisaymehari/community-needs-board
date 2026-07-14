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
        <div style={{
          padding: '3rem 1.5rem',
          border: '1px dashed var(--color-border)',
          borderRadius: '10px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '2rem',
            marginBottom: '0.75rem',
            lineHeight: 1,
          }}>📌</p>
          <p style={{
            fontSize: '15px',
            fontWeight: '600',
            color: 'var(--color-ink)',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
          }}>
            The board is empty right now
          </p>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-sage)',
            lineHeight: '1.7',
            maxWidth: '380px',
            margin: '0 auto 1.5rem',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            Local charities and community groups will post what they need here.
            If you run an organisation, be the first to pin a need.
          </p>
          <a
            href="/post"
            className="nav-cta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--color-green)',
              color: '#fff',
              padding: '0.6rem 1.25rem',
              borderRadius: '7px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            Post the first need
          </a>
        </div>
      ) : filteredNeeds.length === 0 ? (
        <p style={{
          color: 'var(--color-sage)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '14px',
          padding: '1.5rem 0',
        }}>
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
