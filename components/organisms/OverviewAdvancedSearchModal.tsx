'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'
import {
  OVERVIEW_DOCUMENT_TYPE_OPTIONS,
  OVERVIEW_STATUS_OPTIONS,
  type OverviewAccessLevelOption,
  type OverviewAdvancedSearchFilters,
  type OverviewFilterOptions,
  type OverviewStatusOption,
} from '@lib/overview-search'

interface OverviewAdvancedSearchModalProps {
  filters: OverviewAdvancedSearchFilters
  filterOptions: OverviewFilterOptions
  onApply: (filters: OverviewAdvancedSearchFilters) => void
}

function formatFilterLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function OverviewAdvancedSearchModal({
  filters,
  filterOptions,
  onApply,
}: OverviewAdvancedSearchModalProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<OverviewAdvancedSearchFilters>(filters)

  useEffect(() => {
    if (!isOpen) {
      setDraftFilters(filters)
    }
  }, [filters, isOpen])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.author) count += 1
    if (filters.statuses?.length) count += 1
    if (filters.documentType && filters.documentType !== 'all') count += 1
    if (filters.batch) count += 1
    if (filters.createdFrom || filters.createdTo) count += 1
    if (filters.collection) count += 1
    if (filters.accessLevel) count += 1
    return count
  }, [filters])

  const openModal = useCallback(() => {
    setDraftFilters(filters)
    setIsOpen(true)
    requestAnimationFrame(() => dialogRef.current?.showModal())
  }, [filters])

  const closeModal = useCallback(() => {
    dialogRef.current?.close()
    setIsOpen(false)
  }, [])

  const applyFilters = useCallback(() => {
    onApply({
      author: draftFilters.author?.trim() || undefined,
      statuses: draftFilters.statuses?.length ? draftFilters.statuses : undefined,
      documentType: draftFilters.documentType ?? 'all',
      batch: draftFilters.batch?.trim() || undefined,
      createdFrom: draftFilters.createdFrom || undefined,
      createdTo: draftFilters.createdTo || undefined,
      collection: draftFilters.collection || undefined,
      accessLevel: draftFilters.accessLevel || undefined,
    })
    closeModal()
  }, [closeModal, draftFilters, onApply])

  const resetFilters = useCallback(() => {
    const clearedFilters: OverviewAdvancedSearchFilters = {
      documentType: 'all',
    }
    setDraftFilters(clearedFilters)
    onApply(clearedFilters)
    closeModal()
  }, [closeModal, onApply])

  const toggleStatus = useCallback((status: OverviewStatusOption) => {
    setDraftFilters((previousFilters) => {
      const currentStatuses = previousFilters.statuses ?? []
      const nextStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((value) => value !== status)
        : [...currentStatuses, status]

      return {
        ...previousFilters,
        statuses: nextStatuses,
      }
    })
  }, [])

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={openModal} variant="secondary">
          Advanced Search
        </Button>
        {activeFilterCount > 0 ? (
          <span className="text-xs uppercase tracking-[0.1em] text-[#5b5654]">{activeFilterCount} active</span>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        onClose={closeModal}
        className="w-[min(720px,92vw)] rounded-2xl border border-moss/15 bg-white p-0 shadow-panel backdrop:bg-ink/30"
      >
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Advanced Search</h2>
              <p className="mt-1 text-sm text-ink/70">All filters are optional and combine with AND logic.</p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full p-1 text-ink/50 hover:bg-sand hover:text-ink"
              aria-label="Close advanced search"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-medium">Author</span>
              <input
                type="text"
                value={draftFilters.author ?? ''}
                onChange={(event) => setDraftFilters((previousFilters) => ({ ...previousFilters, author: event.target.value }))}
                placeholder="Partial author name"
                className="rounded-xl border border-moss/20 bg-sand/40 px-3 py-2 focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-medium">Batch</span>
              <input
                type="text"
                value={draftFilters.batch ?? ''}
                onChange={(event) => setDraftFilters((previousFilters) => ({ ...previousFilters, batch: event.target.value }))}
                placeholder="Partial batch name"
                className="rounded-xl border border-moss/20 bg-sand/40 px-3 py-2 focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-medium">Collection</span>
              <select
                value={draftFilters.collection ?? ''}
                onChange={(event) =>
                  setDraftFilters((previousFilters) => ({
                    ...previousFilters,
                    collection: event.target.value || undefined,
                  }))
                }
                className="rounded-xl border border-moss/20 bg-sand/40 px-3 py-2 focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
              >
                <option value="">All collections</option>
                {filterOptions.collections.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-medium">Access Level</span>
              <select
                value={draftFilters.accessLevel ?? ''}
                onChange={(event) =>
                  setDraftFilters((previousFilters) => ({
                    ...previousFilters,
                    accessLevel: event.target.value
                      ? (event.target.value as OverviewAccessLevelOption)
                      : undefined,
                  }))
                }
                className="rounded-xl border border-moss/20 bg-sand/40 px-3 py-2 focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
              >
                <option value="">All access levels</option>
                {filterOptions.accessLevels.map((accessLevel) => (
                  <option key={accessLevel} value={accessLevel}>
                    {formatFilterLabel(accessLevel)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {OVERVIEW_STATUS_OPTIONS.map((status) => {
                const isSelected = draftFilters.statuses?.includes(status) ?? false
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      toggleStatus(status)
                    }}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${isSelected ? 'bg-moss text-white' : 'bg-sand text-ink hover:bg-sky'}`}
                  >
                    {formatFilterLabel(status)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Document Type</p>
            <div className="mt-2 flex flex-wrap gap-4">
              {OVERVIEW_DOCUMENT_TYPE_OPTIONS.map((documentType) => (
                <label key={documentType} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="document-type"
                    value={documentType}
                    checked={(draftFilters.documentType ?? 'all') === documentType}
                    onChange={() => {
                      setDraftFilters((previousFilters) => ({ ...previousFilters, documentType }))
                    }}
                  />
                  <span>{documentType === 'all' ? 'All' : `${formatFilterLabel(documentType)} only`}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-medium">Created from</span>
              <input
                type="date"
                value={draftFilters.createdFrom ?? ''}
                onChange={(event) =>
                  setDraftFilters((previousFilters) => ({
                    ...previousFilters,
                    createdFrom: event.target.value || undefined,
                  }))
                }
                className="rounded-xl border border-moss/20 bg-sand/40 px-3 py-2 focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-medium">Created to</span>
              <input
                type="date"
                value={draftFilters.createdTo ?? ''}
                onChange={(event) =>
                  setDraftFilters((previousFilters) => ({
                    ...previousFilters,
                    createdTo: event.target.value || undefined,
                  }))
                }
                className="rounded-xl border border-moss/20 bg-sand/40 px-3 py-2 focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={resetFilters} variant="ghost">
              Reset
            </Button>
            <Button onClick={closeModal} variant="secondary">
              Cancel
            </Button>
            <Button onClick={applyFilters} variant="primary">
              Apply Filters
            </Button>
          </div>
        </div>
      </dialog>
    </>
  )
}
