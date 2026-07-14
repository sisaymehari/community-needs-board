'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'

type AccountType = 'org' | 'volunteer' | 'business' | null

type ToolLink = { href: string; label: string }

const TOOL_LINKS: Record<'org' | 'volunteer' | 'business', ToolLink[]> = {
  org: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/donations', label: 'Donations' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/grants', label: 'Grants' },
    { href: '/documents', label: 'Documents' },
  ],
  volunteer: [
    { href: '/my-offers', label: 'My Offers' },
  ],
  business: [
    { href: '/business-offers', label: 'Business Offers' },
  ],
}

export default function AuthNav() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchProfile = async (userId: string) => {
    const [{ data: orgData }, { data: volData }, { data: bizData }] = await Promise.all([
      supabase.from('organisations').select('name').eq('owner_id', userId).maybeSingle(),
      supabase.from('volunteers').select('name').eq('id', userId).maybeSingle(),
      supabase.from('businesses').select('name').eq('id', userId).maybeSingle(),
    ])
    if (orgData?.name) {
      setProfileName(orgData.name)
      setAccountType('org')
    } else if (volData?.name) {
      setProfileName(volData.name)
      setAccountType('volunteer')
    } else if (bizData?.name) {
      setProfileName(bizData.name)
      setAccountType('business')
    } else {
      setProfileName(null)
      setAccountType(null)
    }
  }

  const clearProfile = () => {
    setProfileName(null)
    setAccountType(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else clearProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close the dropdown on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearProfile()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  if (session === undefined) return null

  if (session) {
    const toolLinks = accountType ? TOOL_LINKS[accountType] : []

    return (
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="card-action-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.4rem 0.75rem',
            fontSize: '13px',
            fontWeight: '500',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            maxWidth: '160px',
          }}
        >
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {profileName ?? 'Account'}
          </span>
          <span aria-hidden="true" style={{ fontSize: '10px', color: 'var(--color-sage)', flexShrink: 0 }}>
            {menuOpen ? '▲' : '▼'}
          </span>
        </button>

        {menuOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              minWidth: '190px',
              background: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: '9px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
              padding: '0.4rem',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 20,
            }}
          >
            {toolLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                role="menuitem"
                className="nav-menu-item"
                style={{
                  display: 'block',
                  padding: '0.55rem 0.7rem',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                {link.label}
              </a>
            ))}

            {toolLinks.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.35rem 0' }} />
            )}

            <button
              role="menuitem"
              onClick={handleLogout}
              className="nav-menu-item"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.55rem 0.7rem',
                borderRadius: '6px',
                fontSize: '13.5px',
                color: 'var(--color-error)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <a
        href="/login"
        className="text-link"
        style={{
          fontSize: '13px',
          color: 'var(--color-sage)',
          textDecoration: 'none',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        Log in
      </a>
      <a
        href="/signup"
        className="nav-cta"
        style={{
          fontSize: '13px',
          fontWeight: '500',
          color: '#fff',
          background: 'var(--color-green)',
          padding: '0.35rem 0.85rem',
          borderRadius: '7px',
          textDecoration: 'none',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        Sign up
      </a>
    </div>
  )
}
