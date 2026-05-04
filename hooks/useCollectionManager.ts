'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  addDocumentsToCollectionAction,
  getDocumentsForCollectionAction,
  getDocumentsNotInCollectionAction,
  removeDocumentsFromCollectionAction,
} from '@actions/collections'
import { sortDocuments, DEFAULT_SELECTION_SORT, type SelectionSortState } from '@molecules/SelectionTable'
import type { Document, PaginatedDocumentsResult } from '@lib/types'

export type CollectionManagerAction = 'add' | 'remove'

export interface CollectionDocumentsParams {
  search?: string
  sortField?: SelectionSortState['field']
  sortDirection?: SelectionSortState['direction']
  page?: number
  pageSize?: number
}

export interface UseCollectionManagerOptions {
  initialAction?: CollectionManagerAction
  loadInCollection?: (collectionId: string, params?: CollectionDocumentsParams) => Promise<PaginatedDocumentsResult>
  loadOutOfCollection?: (collectionId: string, params?: CollectionDocumentsParams) => Promise<PaginatedDocumentsResult>
  addDocuments?: (collectionId: string, documentIds: string[]) => Promise<void>
  removeDocuments?: (collectionId: string, documentIds: string[]) => Promise<void>
  open?: boolean
}

export interface UseCollectionManagerReturn {
  inCollection: Document[]
  outOfCollection: Document[]
  inTotal: number
  outTotal: number
  selectedIn: Set<string>
  selectedOut: Set<string>
  activeAction: CollectionManagerAction
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  inSearch: string
  outSearch: string
  inSort: SelectionSortState
  outSort: SelectionSortState
  inPage: number
  outPage: number
  inPageSize: number
  outPageSize: number
  setActiveAction: (action: CollectionManagerAction) => void
  setInSearch: (value: string) => void
  setOutSearch: (value: string) => void
  setInSort: (state: SelectionSortState) => void
  setOutSort: (state: SelectionSortState) => void
  setInPage: (page: number) => void
  setOutPage: (page: number) => void
  toggleIn: (documentId: string, checked: boolean) => void
  toggleOut: (documentId: string, checked: boolean) => void
  clearSelection: () => void
  handleConfirm: () => Promise<void>
  pendingAction: CollectionManagerAction | null
  setPendingAction: (action: CollectionManagerAction | null) => void
  showConfirm: boolean
  setShowConfirm: (show: boolean) => void
}

function sortDocumentsByName(documents: Document[]): Document[] {
  return sortDocuments(documents, DEFAULT_SELECTION_SORT)
}

function normalizePage(page: number): number {
  return page > 0 ? Math.floor(page) : 1
}

export function useCollectionManager(
  collectionId: string,
  _collectionName: string,
  {
    initialAction = 'add',
    loadInCollection = getDocumentsForCollectionAction,
    loadOutOfCollection = getDocumentsNotInCollectionAction,
    addDocuments = addDocumentsToCollectionAction,
    removeDocuments = removeDocumentsFromCollectionAction,
    open = false,
  }: UseCollectionManagerOptions = {},
): UseCollectionManagerReturn {
  const [inCollection, setInCollection] = useState<Document[]>([])
  const [outOfCollection, setOutOfCollection] = useState<Document[]>([])
  const [inTotal, setInTotal] = useState(0)
  const [outTotal, setOutTotal] = useState(0)
  const [selectedIn, setSelectedIn] = useState<Set<string>>(new Set())
  const [selectedOut, setSelectedOut] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingAction, setPendingAction] = useState<CollectionManagerAction | null>(null)
  const [activeAction, setActiveAction] = useState<CollectionManagerAction>(initialAction)
  const [isLoading, setIsLoading] = useState(!open)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inSearch, setInSearch] = useState('')
  const [outSearch, setOutSearch] = useState('')
  const [inSort, setInSort] = useState<SelectionSortState>(DEFAULT_SELECTION_SORT)
  const [outSort, setOutSort] = useState<SelectionSortState>(DEFAULT_SELECTION_SORT)
  const [inPage, setInPage] = useState(1)
  const [outPage, setOutPage] = useState(1)
  const [inPageSize] = useState(25)
  const [outPageSize] = useState(25)

  const inParams = useMemo<CollectionDocumentsParams>(
    () => ({
      search: inSearch.trim() || undefined,
      sortField: inSort.field,
      sortDirection: inSort.direction,
      page: inPage,
      pageSize: inPageSize,
    }),
    [inSearch, inSort.field, inSort.direction, inPage, inPageSize],
  )

  const outParams = useMemo<CollectionDocumentsParams>(
    () => ({
      search: outSearch.trim() || undefined,
      sortField: outSort.field,
      sortDirection: outSort.direction,
      page: outPage,
      pageSize: outPageSize,
    }),
    [outSearch, outSort.field, outSort.direction, outPage, outPageSize],
  )

  useEffect(() => {
    if (!collectionId || !open) {
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    setActiveAction(initialAction)
    setSelectedIn(new Set())
    setSelectedOut(new Set())
    setShowConfirm(false)
    setPendingAction(null)
    setError(null)
    setIsLoading(true)

    timeoutId = setTimeout(() => {
      if (!cancelled) {
        setError('Timed out loading documents. Please try again.')
        setInCollection([])
        setOutOfCollection([])
        setInTotal(0)
        setOutTotal(0)
        setIsLoading(false)
      }
    }, 15_000)

    Promise.all([loadInCollection(collectionId, inParams), loadOutOfCollection(collectionId, outParams)])
      .then(([nextInCollection, nextOutOfCollection]) => {
        if (cancelled) {
          return
        }

        clearTimeout(timeoutId)
        setInCollection(nextInCollection.documents)
        setOutOfCollection(nextOutOfCollection.documents)
        setInTotal(nextInCollection.total)
        setOutTotal(nextOutOfCollection.total)
        setIsLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return
        }

        clearTimeout(timeoutId)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load collection documents.')
        setInCollection([])
        setOutOfCollection([])
        setInTotal(0)
        setOutTotal(0)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [collectionId, open, initialAction, loadInCollection, loadOutOfCollection, inParams, outParams])

  const toggleIn = useCallback((documentId: string, checked: boolean) => {
    setSelectedIn((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(documentId)
      } else {
        next.delete(documentId)
      }
      return next
    })
  }, [])

  const toggleOut = useCallback((documentId: string, checked: boolean) => {
    setSelectedOut((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(documentId)
      } else {
        next.delete(documentId)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIn(new Set())
    setSelectedOut(new Set())
  }, [])

  const handleSearchChange = useCallback((setter: (value: string) => void, pageSetter: (page: number) => void) => {
    return (value: string) => {
      setter(value)
      pageSetter(1)
    }
  }, [])

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!pendingAction || isSubmitting) {
      return
    }

    const selectedIds = pendingAction === 'add' ? [...selectedOut] : [...selectedIn]

    if (selectedIds.length === 0) {
      setShowConfirm(false)
      setPendingAction(null)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (pendingAction === 'add') {
        await addDocuments(collectionId, selectedIds)
        const movedDocuments = outOfCollection.filter((document) => selectedOut.has(document.id))

        setInCollection((current) => sortDocumentsByName([...current, ...movedDocuments]))
        setOutOfCollection((current) => current.filter((document) => !selectedOut.has(document.id)))
        setInTotal((current) => current + selectedIds.length)
        setOutTotal((current) => Math.max(0, current - selectedIds.length))
        setSelectedOut(new Set())
      } else {
        await removeDocuments(collectionId, selectedIds)
        const movedDocuments = inCollection.filter((document) => selectedIn.has(document.id))

        setOutOfCollection((current) => sortDocumentsByName([...current, ...movedDocuments]))
        setInCollection((current) => current.filter((document) => !selectedIn.has(document.id)))
        setOutTotal((current) => current + selectedIds.length)
        setInTotal((current) => Math.max(0, current - selectedIds.length))
        setSelectedIn(new Set())
      }

      setShowConfirm(false)
      setPendingAction(null)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to update this collection right now.')
    } finally {
      setIsSubmitting(false)
    }
  }, [pendingAction, isSubmitting, selectedOut, selectedIn, addDocuments, removeDocuments, collectionId, outOfCollection, inCollection])

  return {
    inCollection,
    outOfCollection,
    inTotal,
    outTotal,
    selectedIn,
    selectedOut,
    activeAction,
    isLoading,
    isSubmitting,
    error,
    inSearch,
    outSearch,
    inSort,
    outSort,
    inPage,
    outPage,
    inPageSize,
    outPageSize,
    setActiveAction,
    setInSearch: handleSearchChange(setInSearch, setInPage),
    setOutSearch: handleSearchChange(setOutSearch, setOutPage),
    setInSort,
    setOutSort,
    setInPage: (page: number) => setInPage(normalizePage(page)),
    setOutPage: (page: number) => setOutPage(normalizePage(page)),
    toggleIn,
    toggleOut,
    clearSelection,
    handleConfirm,
    pendingAction,
    setPendingAction,
    showConfirm,
    setShowConfirm,
  }
}
