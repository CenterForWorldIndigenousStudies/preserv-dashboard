// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ publishDialog: vi.fn(), reprocessDialog: vi.fn() }))
vi.mock('@organisms/ReadyForLibraryPublishDialog', () => ({
  ReadyForLibraryPublishDialog: (props: {
    documentIds: readonly string[]
    onPublished: (batchId: string) => void
    onClose: () => void
  }) => {
    mocks.publishDialog(props)
    return (
      <div>
        Publish confirmation
        <button
          onClick={() => {
            props.onPublished('publication-batch')
            props.onClose()
          }}
        >
          Queue publication
        </button>
      </div>
    )
  },
}))
vi.mock('@molecules/PipelineExecutionDialog', () => ({
  PipelineExecutionDialog: (props: { open: boolean; documentIds: string[] }) => {
    mocks.reprocessDialog(props)
    return props.open ? <div>Reprocess confirmation</div> : null
  },
}))

import { ReadyForLibraryActions } from '@organisms/ReadyForLibraryActions'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | undefined

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.clearAllMocks()
})

describe('ReadyForLibraryActions', () => {
  it('opens selected Publish and Reprocess dialogs from one Actions menu', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<ReadyForLibraryActions documentIds={['doc-two', 'doc-one']} onPublished={vi.fn()} />))
    expect(container.textContent).toContain('Actions (2)')
    expect(container.textContent).not.toContain('Publish selected')

    const openMenu = () => act(() => container.querySelector<HTMLButtonElement>('button')?.click())
    const clickItem = (label: string) =>
      act(() => {
        Array.from(document.body.querySelectorAll('[role="menuitem"]'))
          .find((item) => item.textContent === label)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
    openMenu()
    expect(Array.from(document.body.querySelectorAll('[role="menuitem"]')).map((item) => item.textContent)).toEqual([
      'Publish',
      'Reprocess',
    ])
    clickItem('Publish')
    expect(mocks.publishDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        documentIds: ['doc-one', 'doc-two'],
      }),
    )
    openMenu()
    clickItem('Reprocess')
    expect(mocks.reprocessDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        documentIds: ['doc-two', 'doc-one'],
      }),
    )
  })

  it('can hand Reprocess to the document details workflow', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const onReprocess = vi.fn()
    act(() =>
      root?.render(
        <ReadyForLibraryActions documentIds={['doc-one']} onPublished={vi.fn()} onReprocess={onReprocess} />,
      ),
    )

    act(() => container.querySelector<HTMLButtonElement>('button')?.click())
    act(() => {
      Array.from(document.body.querySelectorAll('[role="menuitem"]'))
        .find((item) => item.textContent === 'Reprocess')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onReprocess).toHaveBeenCalledOnce()
    expect(mocks.reprocessDialog).not.toHaveBeenCalled()
  })

  it('disables Actions with no selected documents', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<ReadyForLibraryActions documentIds={[]} onPublished={vi.fn()} />))
    expect(container.querySelector('button')?.disabled).toBe(true)
  })

  it('shows a batch link after publication is queued and closes the confirmation', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<ReadyForLibraryActions documentIds={['doc-one']} onPublished={vi.fn()} />))
    act(() => container.querySelector<HTMLButtonElement>('button')?.click())
    act(() => {
      Array.from(document.body.querySelectorAll('[role="menuitem"]'))
        .find((item) => item.textContent === 'Publish')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Queue publication')
        ?.click(),
    )

    expect(container.textContent).not.toContain('Publish confirmation')
    expect(document.body.querySelector('a[href="/batches/publication-batch"]')).not.toBeNull()
  })
})
