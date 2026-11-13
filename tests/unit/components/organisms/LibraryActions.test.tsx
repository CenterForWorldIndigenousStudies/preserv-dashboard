// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ reprocessDialog: vi.fn(), removalDialog: vi.fn() }))

vi.mock('@molecules/PipelineExecutionDialog', () => ({
  PipelineExecutionDialog: (props: { open: boolean; documentIds: string[]; onClose: () => void }) => {
    mocks.reprocessDialog(props)
    return props.open ? <button onClick={props.onClose}>Close reprocessing</button> : null
  },
}))

vi.mock('@organisms/LibraryRemovalActions', () => ({
  LibraryRemovalActions: (props: {
    open: boolean
    documentIds: string[]
    onClose: () => void
    onSubmitted: () => void
  }) => {
    mocks.removalDialog(props)
    return props.open ? <button onClick={props.onSubmitted}>Submit removal</button> : null
  },
}))

import { LibraryActions } from '@organisms/LibraryActions'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | undefined

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.clearAllMocks()
})

describe('LibraryActions', () => {
  it('offers Reprocess and Remove through one menu and preserves the selected IDs for each dialog', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const onRemoved = vi.fn()
    act(() => root?.render(<LibraryActions documentIds={['doc-1', 'doc-2']} onRemoved={onRemoved} />))

    const openMenu = () => act(() => container.querySelector<HTMLButtonElement>('button')?.click())
    const clickItem = (label: string) => act(() => {
      Array.from(document.body.querySelectorAll('[role="menuitem"]'))
        .find((item) => item.textContent === label)
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Actions (2)')
    openMenu()
    expect(Array.from(document.body.querySelectorAll('[role="menuitem"]')).map((item) => item.textContent)).toEqual([
      'Reprocess',
      'Remove',
    ])
    clickItem('Reprocess')
    expect(mocks.reprocessDialog).toHaveBeenLastCalledWith(expect.objectContaining({ documentIds: ['doc-1', 'doc-2'], open: true }))
    act(() => Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Close reprocessing')?.click())

    openMenu()
    clickItem('Remove')
    expect(mocks.removalDialog).toHaveBeenLastCalledWith(expect.objectContaining({ documentIds: ['doc-1', 'doc-2'], open: true }))
    act(() => Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Submit removal')?.click())
    expect(onRemoved).toHaveBeenCalledOnce()
    expect(mocks.removalDialog).toHaveBeenLastCalledWith(expect.objectContaining({ open: false }))
  })

  it('disables the menu without a selected document', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<LibraryActions documentIds={[]} onRemoved={vi.fn()} />))
    expect(container.querySelector('button')?.textContent).toBe('Actions (0)')
    expect(container.querySelector('button')?.disabled).toBe(true)
  })
})
