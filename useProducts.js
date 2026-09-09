import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Public product fetching hook. Only ever reads the `products` table,
 * which RLS restricts (for anonymous/public users) to rows where
 * status = 'published'. See supabase/migrations/001_init.sql.
 */
export function useProducts({ category, featured, newArrival, search } = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('products')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (category && category !== 'All Products') {
      query = query.eq('category', category)
    }
    if (featured) query = query.eq('featured', true)
    if (newArrival) query = query.eq('new_arrival', true)
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setProducts([])
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }, [category, featured, newArrival, search])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { products, loading, error, refetch: fetchProducts }
}

export async function fetchProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()
  return { data, error }
}
