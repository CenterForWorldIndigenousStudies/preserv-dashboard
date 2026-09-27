// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCollectionDetailPath } from '@constants/paths'
import { CollectionActionButton } from '@molecules/CollectionActionButton'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined

function renderActionButton(overrides: Partial<React.ComponentProps<typeof CollectionActionButton>> = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const props: React.ComponentProps<typeof CollectionActionButton> = {
    selectedCount: 1,
    disabled: false,
    hasDocuments: true,
    onEdit: vi.fn(),
    onRename: vi.fn(),
    onAddDocuments: vi.fn(),
    onRemoveDocuments: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }

  act(() => {
    root?.render(<CollectionActionButton {...props} />)
  })

  return { container, props }
}

function openMenu(container: HTMLElement): void {
  act(() => {
    container.querySelector<HTMLButtonElement>('button')?.click()
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  document.body.replaceChildren()
})

describe('CollectionActionButton', () => {
  it('offers all collection actions and disables removal for an empty collection', () => {
    const { container } = renderActionButton({ hasDocuments: false })
    openMenu(container)

    expect(document.body.textContent).toContain('Edit')
    expect(document.body.textContent).toContain('Rename')
    expect(document.body.textContent).toContain('Add Documents')
    expect(document.body.textContent).toContain('Remove Documents')
    expect(document.body.textContent).toContain('Delete')

    const removeItem = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find(
      (item) => item.textContent === 'Remove Documents',
    )
    expect(removeItem?.getAttribute('aria-disabled')).toBe('true')
  })

  it('enables removal and dispatches the selected action', () => {
    const callbacks = {
      onEdit: vi.fn(),
      onRename: vi.fn(),
      onAddDocuments: vi.fn(),
      onRemoveDocuments: vi.fn(),
      onDelete: vi.fn(),
    }
    const { container } = renderActionButton(callbacks)
    openMenu(container)

    const removeItem = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find(
      (item) => item.textContent === 'Remove Documents',
    )
    expect(removeItem?.getAttribute('aria-disabled')).not.toBe('true')

    act(() => {
      removeItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(callbacks.onRemoveDocuments).toHaveBeenCalledOnce()
    expect(callbacks.onEdit).not.toHaveBeenCalled()
    expect(callbacks.onRename).not.toHaveBeenCalled()
    expect(callbacks.onAddDocuments).not.toHaveBeenCalled()
    expect(callbacks.onDelete).not.toHaveBeenCalled()
  })

  it('disables the Actions button when no collection is selected', () => {
    const { container } = renderActionButton({ selectedCount: 0 })

    expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true)
    expect(container.textContent).toContain('Actions (0)')
  })

  it('builds an encoded collection detail path', () => {
    expect(getCollectionDetailPath('collection/one')).toBe('/collections/collection%2Fone')
  })
})
