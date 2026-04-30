'use client'

import { useEffect, useMemo, useState } from 'react'

export interface TagSuggestion {
  id: string
  name: string
  notes: string | null
  score: number
}

interface UseTagSearchOptions {
  limit?: number
  enabled?: boolean
}

interface UseTagSearchResult {
  suggestions: TagSuggestion[]
  isLoading: boolean
  error: string | null
}

export function useTagSearch(query: string, options: UseTagSearchOptions = {}): UseTagSearchResult {
  const limit = options.limit ?? 7
  const enabled = options.enabled ?? true
  const normalizedQuery = useMemo(() => query.trim(), [query])
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || normalizedQuery.length === 0) {
      setSuggestions([])
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      const doFetch = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams({
          query: normalizedQuery,
          limit: String(limit),
        })
        const response = await fetch(`/api/tags/search?${searchParams.toString()}`, {
          signal: controller.signal,
        })
        const payload = (await response.json()) as {
          tags?: TagSuggestion[]
          error?: string
        }

        if (!response.ok) {
          setError(payload.error ?? 'Unable to search tags right now.')
          setSuggestions([])
          return
        }

        setSuggestions(payload.tags ?? [])
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return
        }

        setError('Unable to search tags right now.')
        setSuggestions([])
        } finally {
          setIsLoading(false)
        }
      }
      void doFetch()
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [enabled, limit, normalizedQuery])

  return {
    suggestions,
    isLoading,
    error,
  }
}
