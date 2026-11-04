// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ publishDialog: vi.fn(), reprocessDialog: vi.fn() }))
vi.mock('@organisms/ReadyForLibraryPublishDialog', () => ({
  ReadyForLibraryPublishDialog: (props: { documentIds: readonly string[] }) => {
    mocks.publishDialog(props)
    return <div>Publish confirmation</div>
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
    act(() => root?.render(
      <ReadyForLibraryActions documentIds={['doc-two', 'doc-one']} onPublished={vi.fn()} />,
    ))
    expect(container.textContent).toContain('Actions (2)')
    expect(container.textContent).not.toContain('Publish selected')

    const openMenu = () => act(() => container.querySelector<HTMLButtonElement>('button')?.click())
    const clickItem = (label: string) => act(() => {
      Array.from(document.body.querySelectorAll('[role="menuitem"]'))
        .find((item) => item.textContent === label)
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    openMenu()
    expect(document.body.textContent).toContain('Reprocess')
    expect(document.body.textContent).toContain('Publish')
    clickItem('Publish')
    expect(mocks.publishDialog).toHaveBeenLastCalledWith(expect.objectContaining({
      documentIds: ['doc-one', 'doc-two'],
    }))
    openMenu()
    clickItem('Reprocess')
    expect(mocks.reprocessDialog).toHaveBeenLastCalledWith(expect.objectContaining({
      open: true, documentIds: ['doc-two', 'doc-one'],
    }))
  })

  it('disables Actions with no selected documents', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<ReadyForLibraryActions documentIds={[]} onPublished={vi.fn()} />))
    expect(container.querySelector('button')?.disabled).toBe(true)
  })
})
