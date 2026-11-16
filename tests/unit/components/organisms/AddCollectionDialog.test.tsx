// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { act, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@mui/material/Dialog', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@molecules/TagSearchCombobox', () => ({
  TagSearchCombobox: ({ label }: { label: string }) => <div>{label}</div>,
}))

vi.mock('@organisms/Modal', () => ({
  Modal: ({ children, actions }: { children: ReactNode; actions: ReactNode }) => (
    <div>
      {children}
      {actions}
    </div>
  ),
}))

vi.mock('@actions/collections', () => ({
  createCollectionAction: vi.fn(() => Promise.resolve({ tag_id: 'new-tag', collection_name: 'New Collection' })),
  createCollectionWithNewTagAction: vi.fn(() => Promise.resolve()),
}))

import { createCollectionAction } from '@actions/collections'
import { AddCollectionDialog } from '@organisms/AddCollectionDialog'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('AddCollectionDialog', () => {
  it('offers a locked canonical qualifier, additional qualifiers, and a Library ID', () => {
    const markup = renderToStaticMarkup(<AddCollectionDialog open collections={[]} onClose={vi.fn()} />)

    expect(markup).toContain('Canonical qualifier (required)')
    expect(markup).toContain('Additional qualifiers')
    expect(markup).toContain('Library ID')
    expect(markup).toContain('Collection notes')
  })

  it('prefills a new collection name and reports the created collection to the batch form', async () => {
    const onCreated = vi.fn()
    const onClose = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <AddCollectionDialog
          open
          collections={[]}
          initialName={'New Collection'}
          onCreated={onCreated}
          onClose={onClose}
        />,
      )
      await Promise.resolve()
    })

    const submit = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Add Collection',
    )
    await act(async () => {
      submit?.click()
      await Promise.resolve()
    })

    expect(createCollectionAction).toHaveBeenCalledWith(expect.objectContaining({ tagName: 'New Collection' }))
    expect(onCreated).toHaveBeenCalledWith({ tag_id: 'new-tag', collection_name: 'New Collection' })
    expect(onClose).toHaveBeenCalledOnce()

    act(() => root.unmount())
    container.remove()
  })

  it('saves a collection proposal without creating a collection', async () => {
    vi.mocked(createCollectionAction).mockClear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ collections: [] }),
      }),
    )
    const onProposalSaved = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <AddCollectionDialog
          open
          collections={[]}
          initialName={'Proposed collection'}
          onProposalSaved={onProposalSaved}
          onClose={vi.fn()}
        />,
      )
      await Promise.resolve()
    })
    const submit = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Save for batch',
    )
    await act(async () => {
      submit?.click()
      await Promise.resolve()
    })

    expect(onProposalSaved).toHaveBeenCalledWith({
      name: 'Proposed collection',
      notes: null,
      tagNotes: null,
      qualifierNames: [],
      fedoraNodeId: null,
    })
    expect(createCollectionAction).not.toHaveBeenCalled()
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })
})
