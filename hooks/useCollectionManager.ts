'use client'

import { useCallback, useEffect, useState } from 'react'

import { addDocumentsToCollectionAction, getDocumentsForCollectionAction, getDocumentsNotInCollectionAction, removeDocumentsFromCollectionAction } from '@actions/collections'
import { sortDocuments, DEFAULT_SELECTION_SORT, type SelectionSortState } from '@molecules/SelectionTable'
import type { Document } from '@lib/types'

export type CollectionManagerAction = 'add' | 'remove'

export interface UseCollectionManagerOptions {
  initialAction?: CollectionManagerAction
  loadInCollection?: (collectionId: string) => Promise<Document[]>
  loadOutOfCollection?: (collectionId: string) => Promise<Document[]>
  addDocuments?: (collectionId: string, documentIds: string[]) => Promise<void>
  removeDocuments?: (collectionId: string, documentIds: string[]) => Promise<void>
  open?: boolean
}

export interface UseCollectionManagerReturn {
  inCollection: Document[]
  outOfCollection: Document[]
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
  setActiveAction: (action: CollectionManagerAction) => void
  setInSearch: (value: string) => void
  setOutSearch: (value: string) => void
  setInSort: (state: SelectionSortState) => void
  setOutSort: (state: SelectionSortState) => void
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

  // Load documents when the modal opens
  useEffect(() => {
    if (!collectionId || !open) {
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    setActiveAction(initialAction)
    setSelectedIn(new Set())
    setSelectedOut(new Set())
    setInSearch('')
    setOutSearch('')
    setInSort(DEFAULT_SELECTION_SORT)
    setOutSort(DEFAULT_SELECTION_SORT)
    setShowConfirm(false)
    setPendingAction(null)
    setError(null)
    setIsLoading(true)

    // Defensive 15-second timeout so the modal never hangs silently
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        setError('Timed out loading documents. Please try again.')
        setInCollection([])
        setOutOfCollection([])
        setIsLoading(false)
      }
    }, 15_000)

    Promise.all([loadInCollection(collectionId), loadOutOfCollection(collectionId)])
      .then(([nextInCollection, nextOutOfCollection]) => {
        if (cancelled) {
          return
        }

        clearTimeout(timeoutId)
        setInCollection(sortDocumentsByName(nextInCollection))
        setOutOfCollection(sortDocumentsByName(nextOutOfCollection))
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
        setIsLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [collectionId, open, initialAction, loadInCollection, loadOutOfCollection])

  const toggleIn = useCallback((documentId: string, checked: boolean) => {
    setSelectedIn((current) => {
      const next = new Set(current)
      if (checked) {
        next.delete(documentId)
      } else {
        next.add(documentId)
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
        setSelectedOut(new Set())
      } else {
        await removeDocuments(collectionId, selectedIds)
        const movedDocuments = inCollection.filter((document) => selectedIn.has(document.id))

        setOutOfCollection((current) => sortDocumentsByName([...current, ...movedDocuments]))
        setInCollection((current) => current.filter((document) => !selectedIn.has(document.id)))
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
    setActiveAction,
    setInSearch,
    setOutSearch,
    setInSort,
    setOutSort,
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
