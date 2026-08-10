'use client'

import { useEffect, useMemo, useState } from 'react'

import { BATCH_SEARCH_PATH } from '@constants/paths'
import { BATCH_SEARCH_LIMIT } from '@lib/batchSearch'
import type { BatchSearchResponse, BatchSearchSuggestion } from 'types/batches'

interface UseBatchSearchOptions {
  limit?: number
  enabled?: boolean
}

export interface UseBatchSearchResult {
  suggestions: BatchSearchSuggestion[]
  exactMatch: BatchSearchSuggestion | null
  isLoading: boolean
  error: string | null
}

export function useBatchSearch(query: string, options: UseBatchSearchOptions = {}): UseBatchSearchResult {
  const limit = options.limit ?? BATCH_SEARCH_LIMIT
  const enabled = options.enabled ?? true
  const normalizedQuery = useMemo(() => query.trim(), [query])
  const [suggestions, setSuggestions] = useState<BatchSearchSuggestion[]>([])
  const [exactMatch, setExactMatch] = useState<BatchSearchSuggestion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || normalizedQuery.length === 0) {
      setSuggestions([])
      setExactMatch(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      const doFetch = async (): Promise<void> => {
        setIsLoading(true)
        setError(null)

        try {
          const searchParams = new URLSearchParams({
            query: normalizedQuery,
            limit: String(limit),
          })
          const response = await fetch(`${BATCH_SEARCH_PATH}?${searchParams.toString()}`, {
            signal: controller.signal,
          })
          const payload = (await response.json()) as Partial<BatchSearchResponse> & { error?: string }

          if (!response.ok) {
            setError(payload.error ?? 'Unable to search batches right now.')
            setSuggestions([])
            setExactMatch(null)
            return
          }

          setSuggestions(payload.batches ?? [])
          setExactMatch(payload.exactMatch ?? null)
        } catch (fetchError) {
          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
            return
          }

          setError('Unable to search batches right now.')
          setSuggestions([])
          setExactMatch(null)
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
    exactMatch,
    isLoading,
    error,
  }
}
