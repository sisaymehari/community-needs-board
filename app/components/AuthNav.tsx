'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'

export default function AuthNav() {
  const router = useRouter()
  // undefined = still loading; null = not logged in; Session = logged in
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [orgName, setOrgName] = useState<string | null>(null)

  const fetchOrg = async (userId: string) => {
    const { data } = await supabase
      .from('organisations')
      .select('name')
      .eq('owner_id', userId)
      .single()
    setOrgName(data?.name ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchOrg(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchOrg(session.user.id)
      else setOrgName(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setOrgName(null)
    router.push('/')
    router.refresh()
  }

  // Render nothing during SSR and initial hydration to avoid mismatch
  if (session === undefined) return null

  if (session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {orgName && (
          <span style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#374151',
            fontFamily: 'sans-serif',
          }}>
            {orgName}
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '0.35rem 0.75rem',
            fontSize: '13px',
            color: '#6b7280',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
          }}
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <a
        href="/login"
        style={{
          fontSize: '13px',
          color: '#6b7280',
          textDecoration: 'none',
          fontFamily: 'sans-serif',
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
          background: '#1D6A48',
          padding: '0.35rem 0.75rem',
          borderRadius: '6px',
          textDecoration: 'none',
          fontFamily: 'sans-serif',
        }}
      >
        Sign up
      </a>
    </div>
  )
}
