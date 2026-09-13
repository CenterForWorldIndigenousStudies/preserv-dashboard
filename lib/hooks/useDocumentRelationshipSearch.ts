'use client'

import { useEffect, useMemo, useState } from 'react'

import { getDocumentRelationshipSearchPath } from '@constants/paths'
import type { DocumentRelationshipKind, RelationshipOption } from '@lib/queries/documentRelationshipQueries'

interface UseDocumentRelationshipSearchResult {
  suggestions: RelationshipOption[]
  isLoading: boolean
  error: string | null
}

export function useDocumentRelationshipSearch(
  kind: DocumentRelationshipKind,
  query: string,
  enabled = true,
): UseDocumentRelationshipSearchResult {
  const normalizedQuery = useMemo(() => query.trim(), [query])
  const [suggestions, setSuggestions] = useState<RelationshipOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || normalizedQuery.length < 2) {
      setSuggestions([])
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true)
        setError(null)

        try {
          const response = await fetch(
            `${getDocumentRelationshipSearchPath(kind)}?q=${encodeURIComponent(normalizedQuery)}`,
            { signal: controller.signal },
          )
          const payload = (await response.json()) as { items?: RelationshipOption[]; error?: string }
          if (!response.ok) {
            setSuggestions([])
            setError(payload.error ?? `Unable to search ${kind}s right now.`)
            return
          }

          setSuggestions(payload.items ?? [])
        } catch (fetchError) {
          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
          setSuggestions([])
          setError(`Unable to search ${kind}s right now.`)
        } finally {
          setIsLoading(false)
        }
      })()
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [enabled, kind, normalizedQuery])

  return { suggestions, isLoading, error }
}
