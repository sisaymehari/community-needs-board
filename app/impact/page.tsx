import { createClient } from '@supabase/supabase-js'

// Force-dynamic so counts are always fresh, never served from static cache
export const dynamic = 'force-dynamic'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

// ── StatCard ─────────────────────────────────────────────────────────────────
// Server-component version — identical visual style to the dashboard StatCard
// but no useState/useEffect needed since this is pure display

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
      padding: '1.4rem 1.5rem 1.6rem',
      background: '#fff',
    }}>
      <div style={{
        fontFamily: 'var(--font-ibm-plex-mono), monospace',
        fontSize: '10.5px',
        fontWeight: '500',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'var(--color-sage)',
        marginBottom: '0.6rem',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)',
        fontWeight: '700',
        letterSpacing: '-0.025em',
        color: accent ? 'var(--color-green)' : 'var(--color-ink)',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
//
// All queries run server-side using the service role key — the key is never
// sent to the browser. We return aggregate counts and sums only; no row-level
// personal data (names, emails, messages) is read or rendered.
//
// Why service role instead of anon key:
//   - donations, volunteers, and offers all have ownership-scoped SELECT
//     policies that would return 0 rows for an unauthenticated public request.
//   - Using the service role server-side bypasses RLS to count rows safely,
//     equivalent to a SECURITY DEFINER Postgres function that returns COUNTs.

export default async function ImpactPage() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const [
    totalNeedsRes,
    fulfilledRes,
    totalOrgsRes,
    totalVolunteersRes,
    totalOffersRes,
    moneyRes,
  ] = await Promise.all([
    admin.from('needs').select('id', { count: 'exact', head: true }),
    admin.from('needs').select('id', { count: 'exact', head: true }).eq('is_fulfilled', true),
    admin.from('organisations').select('id', { count: 'exact', head: true }),
    admin.from('volunteers').select('id', { count: 'exact', head: true }),
    admin.from('offers').select('id', { count: 'exact', head: true }),
    admin.from('donations').select('amount').eq('type', 'money'),
  ])

  const totalMoney = (moneyRes.data ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0)

  return (
    <main className="page-wrap" style={{ maxWidth: '800px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        paddingBottom: '2.5rem',
        marginBottom: '2.5rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
          fontSize: 'clamp(1.9rem, 4vw, 2.4rem)',
          fontWeight: '700',
          letterSpacing: '-0.02em',
          color: 'var(--color-ink)',
          margin: '0 0 0.8rem',
        }}>
          Our Impact So Far
        </h1>
        <p style={{
          color: 'var(--color-sage)',
          fontSize: '15px',
          lineHeight: '1.7',
          maxWidth: '560px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          margin: 0,
        }}>
          Live numbers from the Community Needs Board — every need posted,
          donation logged, and offer to help counted in real time.
        </p>
      </div>

      {/* Stat grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
      }}>
        <StatCard label="Needs Posted"     value={totalNeedsRes.count ?? 0} />
        <StatCard label="Needs Fulfilled"  value={fulfilledRes.count ?? 0}    accent />
        <StatCard label="Money Raised"     value={formatCurrency(totalMoney)} accent />
        <StatCard label="Organisations"    value={totalOrgsRes.count ?? 0} />
        <StatCard label="Volunteers"       value={totalVolunteersRes.count ?? 0} />
        <StatCard label="Offers to Help"   value={totalOffersRes.count ?? 0}   accent />
      </div>

    </main>
  )
}
