// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockUseTagSearch, mockUseBatchSearch } = vi.hoisted(() => ({
  mockUseTagSearch: vi.fn(),
  mockUseBatchSearch: vi.fn(),
}))

vi.mock('@lib/hooks/useTagSearch', () => ({
  useTagSearch: mockUseTagSearch,
}))

vi.mock('@lib/hooks/useBatchSearch', () => ({
  useBatchSearch: mockUseBatchSearch,
}))

vi.mock('@molecules/SearchEntityBox', () => ({
  SearchEntityBox: (props: {
    inputValue: string
    options: Array<{ id: string; name: string }>
    label: string
    onInputChange: (value: string) => void
    onSelectOption?: (option: { id: string; name: string }) => void
  }) => (
    <div data-testid={`search-field-${props.label.toLowerCase()}`}>
      <label>
        {props.label}
        <input
          aria-label={props.label}
          value={props.inputValue}
          onChange={(event) => {
            props.onInputChange(event.target.value)
          }}
        />
      </label>
      {props.options.map((option) => (
        <button
          key={option.id}
          onClick={() => {
            props.onSelectOption?.(option)
          }}
          type={'button'}
        >
          {option.name}
        </button>
      ))}
    </div>
  ),
}))

import { AdvancedSearchModal } from '@organisms/AdvancedSearchModal'
import type { AdvancedSearchFilters, FilterOptions } from '@lib/search'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const defaultFilters: AdvancedSearchFilters = {
  author: '',
  tag: '',
  statuses: [],
  documentType: 'all',
  batch: '',
  createdFrom: '',
  createdTo: '',
  collection: '',
  accessLevel: undefined,
}

const filterOptions: FilterOptions = {
  collections: [],
  accessLevels: [],
  statuses: [],
}

let mountedRoot: Root | undefined

function renderModal(onApply: (filters: AdvancedSearchFilters) => void): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(
      <AdvancedSearchModal filters={defaultFilters} filterOptions={filterOptions} onApply={onApply} />,
    )
  })

  return container
}

describe('AdvancedSearchModal', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
    mockUseTagSearch.mockReset()
    mockUseBatchSearch.mockReset()
  })

  it('writes selected tag and batch names into the existing string filters', () => {
    mockUseTagSearch.mockReturnValue({
      suggestions: [{ id: 'tag-1', name: 'Cherokee', notes: null, score: 100 }],
      isLoading: false,
      error: null,
    })
    mockUseBatchSearch.mockReturnValue({
      suggestions: [{ id: 'batch-1', name: 'Special batch', score: 100 }],
      exactMatch: null,
      isLoading: false,
      error: null,
    })
    const onApply = vi.fn()
    const container = renderModal(onApply)

    act(() => {
      container.querySelector<HTMLButtonElement>('button')?.click()
    })
    act(() => {
      const batchOption = Array.from(document.body.querySelectorAll('button')).find(
        (button) => button.textContent === 'Special batch',
      )
      batchOption?.click()
      const tagOption = Array.from(document.body.querySelectorAll('button')).find(
        (button) => button.textContent === 'Cherokee',
      )
      tagOption?.click()
    })

    const applyButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Apply Filters',
    )
    act(() => {
      applyButton?.click()
    })

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ tag: 'Cherokee', batch: 'Special batch' }))
  })

  it('keeps arbitrary free-text tag and batch values available', () => {
    mockUseTagSearch.mockReturnValue({ suggestions: [], isLoading: false, error: null })
    mockUseBatchSearch.mockReturnValue({ suggestions: [], exactMatch: null, isLoading: false, error: null })
    const onApply = vi.fn()
    const container = renderModal(onApply)

    act(() => {
      container.querySelector<HTMLButtonElement>('button')?.click()
    })

    const tagInput = document.body.querySelector<HTMLInputElement>('input[aria-label="Tag"]')
    const batchInput = document.body.querySelector<HTMLInputElement>('input[aria-label="Batch"]')
    if (!tagInput || !batchInput) {
      throw new Error('Expected Advanced Search Tag and Batch inputs')
    }

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(tagInput, 'close tag match')
      tagInput.dispatchEvent(new Event('input', { bubbles: true }))
      valueSetter?.call(batchInput, 'partial batch')
      batchInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const applyButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Apply Filters',
    )
    act(() => {
      applyButton?.click()
    })

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ tag: 'close tag match', batch: 'partial batch' }))
  })

  it('shows batch lifecycle and publication status filters when provided', () => {
    mockUseTagSearch.mockReturnValue({ suggestions: [], isLoading: false, error: null })
    mockUseBatchSearch.mockReturnValue({ suggestions: [], exactMatch: null, isLoading: false, error: null })
    const onApply = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(
        <AdvancedSearchModal
          filters={defaultFilters}
          filterOptions={{
            ...filterOptions,
            lifecycleStatuses: ['DRAFT', 'FAILED'],
            publicationStatuses: ['NOT_STARTED', 'PUBLISHED'],
          }}
          onApply={onApply}
        />,
      )
    })

    act(() => {
      container.querySelector<HTMLButtonElement>('button')?.click()
    })

    expect(document.body.textContent).toContain('Batch lifecycle status')
    expect(document.body.textContent).toContain('Draft')
    expect(document.body.textContent).toContain('Failed')
    expect(document.body.textContent).toContain('Publication status')
    expect(document.body.textContent).toContain('Not Started')
    expect(document.body.textContent).toContain('Published')
  })
})
