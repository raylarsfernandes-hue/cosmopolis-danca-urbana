import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { EventSettings } from '../types'

// Os dados do evento vêm só do banco (tabela event_settings).
// Guardamos em memória para não buscar de novo a cada troca de página.
let cache: EventSettings | null = null
let pending: Promise<EventSettings | null> | null = null

function fetchSettings() {
  if (!pending) {
    pending = Promise.resolve(
      supabase.from('event_settings').select('*').limit(1).maybeSingle()
    ).then(({ data }) => {
      cache = (data as EventSettings) ?? null
      return cache
    })
  }
  return pending
}

export function invalidateEventSettings() {
  cache = null
  pending = null
}

export function useEventSettings() {
  const [settings, setSettings] = useState<EventSettings | null>(cache)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) return
    fetchSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  return { settings, loading }
}
