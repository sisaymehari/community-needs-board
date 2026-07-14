import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍎',
  clothing: '👕',
  equipment: '🔧',
  other: '📦',
}

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
}

type NeedRow = {
  id: string
  description: string
  category: string
  organisation_id: string
  organisations: { name: string } | null
}

type ShareableItemRow = {
  item_name: string
  category: string
  organisation_id: string
  organisations: { name: string } | null
}

type BusinessOfferRow = {
  item_description: string
  category: string
  business_id: string
  businesses: { name: string } | null
}

type Supplier = { name: string; kind: 'Charity' | 'Business'; items: string[] }

type MatchGroup = {
  need: NeedRow
  suppliers: Supplier[]
}

// ── Page ─────────────────────────────────────────────────────────────────────
//
// Public page — no login required, matching the openness of the needs board.
// All matching is computed server-side using the service role key, which lets
// us read shareable inventory across every organisation without exposing that
// table to public RLS access. Only category, item names, and organisation
// names are ever sent to the browser — quantities never leave this function.

export default async function MatchesPage() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const [needsRes, itemsRes, businessOffersRes] = await Promise.all([
    admin
      .from('needs')
      .select('id, description, category, organisation_id, organisations(name)')
      .eq('is_fulfilled', false),
    admin
      .from('inventory_items')
      .select('item_name, category, organisation_id, organisations(name)')
      .eq('available_to_share', true),
    admin
      .from('business_offers')
      .select('item_description, category, business_id, businesses(name)')
      .eq('available', true),
  ])

  if (businessOffersRes.error) {
    console.error('[matches] Failed to fetch business_offers:', businessOffersRes.error)
  }

  const needs = (needsRes.data as unknown as NeedRow[]) ?? []
  const shareableItems = (itemsRes.data as unknown as ShareableItemRow[]) ?? []
  const businessOffers = (businessOffersRes.data as unknown as BusinessOfferRow[]) ?? []

  const matches: MatchGroup[] = []

  for (const need of needs) {
    const suppliersByKey = new Map<string, Supplier>()

    for (const item of shareableItems) {
      if (item.category !== need.category) continue
      if (item.organisation_id === need.organisation_id) continue

      const key = `charity:${item.organisation_id}`
      const existing = suppliersByKey.get(key)
      if (existing) {
        existing.items.push(item.item_name)
      } else {
        suppliersByKey.set(key, {
          name: item.organisations?.name ?? 'An organisation',
          kind: 'Charity',
          items: [item.item_name],
        })
      }
    }

    for (const offer of businessOffers) {
      if (offer.category !== need.category) continue

      const key = `business:${offer.business_id}`
      const existing = suppliersByKey.get(key)
      if (existing) {
        existing.items.push(offer.item_description)
      } else {
        suppliersByKey.set(key, {
          name: offer.businesses?.name ?? 'A business',
          kind: 'Business',
          items: [offer.item_description],
        })
      }
    }

    if (suppliersByKey.size > 0) {
      matches.push({ need, suppliers: Array.from(suppliersByKey.values()) })
    }
  }

  return (
    <main className="page-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        paddingBottom: '2rem',
        marginBottom: '2.5rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
          fontSize: 'clamp(1.7rem, 4vw, 2.2rem)',
          fontWeight: '700',
          letterSpacing: '-0.02em',
          color: 'var(--color-ink)',
          margin: '0 0 0.8rem',
        }}>
          Charity-to-Charity Matches
        </h1>
        <p style={{
          color: 'var(--color-sage)',
          fontSize: '1rem',
          lineHeight: '1.7',
          maxWidth: '620px',
        }}>
          When a charity or local business has surplus stock in a category another organisation
          needs, it shows up here. Exact quantities stay private — reach out directly to arrange
          a handover.
        </p>
      </div>

      {matches.length === 0 ? (
        <div style={{
          padding: '2.5rem 1.5rem',
          border: '1px dashed var(--color-border)',
          borderRadius: '10px',
          textAlign: 'center',
        }}>
          <p style={{
            color: 'var(--color-sage)',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            No matches right now — check back soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {matches.map(({ need, suppliers }) => (
            <div key={need.id} style={{
              position: 'relative',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '1.5rem 1.75rem',
              background: '#fff',
            }}>
              <span aria-hidden="true" style={{
                position: 'absolute',
                top: '-5px',
                left: '20px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--color-green)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.18), 0 0 0 2px var(--color-bg)',
                display: 'block',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>
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
              </div>

              <p style={{
                fontSize: '15.5px',
                fontWeight: '600',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                margin: '0 0 0.3rem',
              }}>
                {need.organisations?.name ?? 'An organisation'} needs {need.category}
              </p>
              <p style={{
                fontSize: '14px',
                color: 'var(--color-sage)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                lineHeight: '1.6',
                margin: '0 0 1.1rem',
              }}>
                {need.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {suppliers.map(supplier => (
                  <div key={`${supplier.kind}:${supplier.name}`} style={{
                    background: 'var(--color-marigold-bg)',
                    border: '1px solid var(--color-marigold)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.3rem' }}>
                      <span style={{
                        ...monoSm,
                        background: supplier.kind === 'Business' ? '#fff' : 'var(--color-marigold)',
                        color: supplier.kind === 'Business' ? 'var(--color-marigold)' : '#fff',
                        border: supplier.kind === 'Business' ? '1px solid var(--color-marigold)' : 'none',
                        padding: '1px 8px',
                        borderRadius: '100px',
                      }}>
                        {supplier.kind}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      margin: 0,
                    }}>
                      <strong>{supplier.name}</strong> has surplus {need.category} available.
                    </p>
                    <p style={{
                      fontSize: '12.5px',
                      color: 'var(--color-sage)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      margin: '0.3rem 0 0',
                    }}>
                      Items: {Array.from(new Set(supplier.items)).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
