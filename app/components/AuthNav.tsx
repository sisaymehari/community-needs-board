'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'

type AccountType = 'org' | 'volunteer' | null

export default function AuthNav() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<AccountType>(null)

  const fetchProfile = async (userId: string) => {
    const [{ data: orgData }, { data: volData }] = await Promise.all([
      supabase.from('organisations').select('name').eq('owner_id', userId).maybeSingle(),
      supabase.from('volunteers').select('name').eq('id', userId).maybeSingle(),
    ])
    if (orgData?.name) {
      setProfileName(orgData.name)
      setAccountType('org')
    } else if (volData?.name) {
      setProfileName(volData.name)
      setAccountType('volunteer')
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearProfile()
    router.push('/')
    router.refresh()
  }

  if (session === undefined) return null

  if (session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {profileName && (
          <span style={{
            fontSize: '13px',
            fontWeight: '500',
            color: 'var(--color-sage)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            {profileName}
          </span>
        )}
        {accountType === 'org' && (
          <a
            href="/donations"
            style={{
              fontSize: '13px',
              color: 'var(--color-sage)',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            Donations
          </a>
        )}
        {accountType === 'volunteer' && (
          <a
            href="/my-offers"
            style={{
              fontSize: '13px',
              color: 'var(--color-sage)',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            My Offers
          </a>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: '7px',
            padding: '0.35rem 0.85rem',
            fontSize: '13px',
            color: 'var(--color-sage)',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <a
        href="/login"
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
