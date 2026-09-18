// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDocumentEditContext } from '@lib/hooks/useDocumentEditContext'
import { DocumentEditCoordinator } from '@organisms/DocumentEditCoordinator'

const mockRefresh = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@molecules/DocumentEditActions', () => ({
  DocumentEditActions: ({ isDirty, onSave }: { isDirty: boolean; onSave: () => void }) =>
    isDirty ? <button onClick={onSave}>{'Save Changes'}</button> : null,
}))

vi.mock('@molecules/DocumentEditConfirmationDialog', () => ({
  DocumentEditConfirmationDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) =>
    open ? <button onClick={onConfirm}>{'Confirm Save'}</button> : null,
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function DraftEditor(): React.ReactElement {
  const context = useDocumentEditContext()
  return <button onClick={() => context?.updateMetadata('dc_title', 'Updated title')}>{'Change title'}</button>
}

describe('DocumentEditCoordinator successful save', () => {
  let root: Root | undefined

  afterEach(() => {
    vi.restoreAllMocks()
    act(() => root?.unmount())
    root = undefined
    document.body.replaceChildren()
    mockRefresh.mockReset()
  })

  it('shows a success toast, exits edit mode, and refreshes after saving', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: {
            metadata: [{ name: 'dc_title', value: 'Updated title', value_type: 'string', notes: null }],
            quality: null,
            document_to_tags: [],
            document_to_contributors: [],
            document_to_publishers: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <DocumentEditCoordinator
          documentId={'doc-1'}
          metadata={[{ name: 'dc_title', value: 'Original title', value_type: 'string', notes: null }]}
          quality={null}
          initialTags={[]}
          initialContributors={[]}
          initialPublishers={[]}
          initialAccessLevels={[]}
        >
          <DraftEditor />
        </DocumentEditCoordinator>,
      )
    })

    act(() => {
      container.querySelector('input[type="checkbox"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Change title')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Save Changes')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Confirm Save')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Document changes saved.')
    expect(container.textContent).not.toContain('Save Changes')
    expect(mockRefresh).toHaveBeenCalledOnce()
  })
})
