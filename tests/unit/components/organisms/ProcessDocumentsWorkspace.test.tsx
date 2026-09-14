// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PROCESS_FOLDERS_PATH, PROCESS_START_PATH } from '@constants/paths'
import { ProcessDocumentsWorkspace } from '@organisms/ProcessDocumentsWorkspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@lib/hooks/useBatchSearch', () => ({
  useBatchSearch: () => ({ exactMatch: null, error: null }),
}))

vi.mock('@organisms/ProcessBatchMonitor', () => ({
  ProcessBatchMonitor: () => <div />,
}))

vi.mock('@organisms/ReprocessingDraftWorkspace', () => ({
  ReprocessingDraftWorkspace: () => <div />,
}))

vi.mock('@organisms/ProcessBatchCreationWorkspace', () => ({
  ProcessBatchCreationWorkspace: (props: { googleDriveExpanded: boolean; onSubmit: () => void }) => (
    <div>
      <div data-testid={'google-drive-expanded'}>{String(props.googleDriveExpanded)}</div>
      <button type={'button'} onClick={props.onSubmit}>
        {'Process'}
      </button>
    </div>
  ),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

function renderWorkspace(): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(<ProcessDocumentsWorkspace initialBatches={[]} />)
  })

  return container
}

describe('ProcessDocumentsWorkspace', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('collapses Google Drive after a successful Process submission', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url === PROCESS_FOLDERS_PATH) {
        return Promise.resolve(new Response(JSON.stringify({ folders: [] }), { status: 200 }))
      }
      if (url === PROCESS_START_PATH) {
        return Promise.resolve(
          new Response(JSON.stringify({ batchId: 'batch-1', batchName: 'Batch 1' }), { status: 200 }),
        )
      }
      throw new Error(`Unexpected request: ${url}`)
    })

    const container = renderWorkspace()
    expect(container.querySelector('[data-testid="google-drive-expanded"]')?.textContent).toBe('true')

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="google-drive-expanded"]')?.textContent).toBe('false')
  })
})
