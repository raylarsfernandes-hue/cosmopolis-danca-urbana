import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Availability } from '../types'

export function useAvailability() {
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    supabase
      .from('availability_public')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setAvailability((data as Availability) ?? null)
        setLoading(false)
      })
  }, [])

  useEffect(() => { reload() }, [reload])

  return { availability, loading, reload }
}
