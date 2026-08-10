// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockUseTagSearch } = vi.hoisted(() => ({
  mockUseTagSearch: vi.fn(),
}))

vi.mock('@lib/hooks/useTagSearch', () => ({
  useTagSearch: mockUseTagSearch,
}))

vi.mock('@molecules/SearchEntityBox', () => ({
  SearchEntityBox: (props: {
    inputValue: string
    options: Array<{ name: string }>
    label: string
    onSelectFreeText?: (value: string) => void
  }) => (
    <>
      <div data-testid={'search-entity-box'} data-input-value={props.inputValue} data-label={props.label}>
        {props.options.map((option) => option.name).join('|')}
      </div>
      <button
        data-testid={'select-free-text'}
        onClick={() => {
          props.onSelectFreeText?.('New tag')
        }}
        type={'button'}
      />
    </>
  ),
}))

import { TagSearchCombobox } from '@molecules/TagSearchCombobox'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

function renderCombobox(onSelectCreate: (tagName: string) => void = vi.fn(), value = 'Cher'): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(
      <TagSearchCombobox
        open
        value={value}
        onSelectExisting={vi.fn()}
        onSelectCreate={onSelectCreate}
      />,
    )
  })

  return container
}

describe('TagSearchCombobox', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
    mockUseTagSearch.mockReset()
  })

  it('delegates ranked tag options and create behavior to SearchEntityBox', () => {
    mockUseTagSearch.mockReturnValue({
      suggestions: [
        {
          id: 'tag-1',
          name: 'Cherokee',
          notes: 'Nation',
          score: 100,
        },
      ],
      isLoading: false,
      error: null,
    })

    const container = renderCombobox()
    const shell = container.querySelector('[data-testid="search-entity-box"]')

    expect(shell?.getAttribute('data-label')).toBe('Search tags')
    expect(shell?.textContent).toContain('Cherokee')
    expect(shell?.textContent).toContain('Create new tag')
  })

  it('keeps free-text creation connected to the generic shell', () => {
    const onSelectCreate = vi.fn()
    mockUseTagSearch.mockReturnValue({ suggestions: [], isLoading: false, error: null })

    const container = renderCombobox(onSelectCreate)
    act(() => {
      container.querySelector<HTMLElement>('[data-testid="select-free-text"]')?.click()
    })

    expect(onSelectCreate).toHaveBeenCalledWith('New tag')
  })
})
