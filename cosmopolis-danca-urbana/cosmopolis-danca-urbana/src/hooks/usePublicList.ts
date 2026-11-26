import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Lê uma view pública ordenada por order_index (workshops, batalhas, logos).
export function usePublicList<T>(view: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase
      .from(view)
      .select('*')
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (!alive) return
        setItems((data ?? []) as T[])
        setLoading(false)
      })
    return () => { alive = false }
  }, [view])

  return { items, loading }
}
