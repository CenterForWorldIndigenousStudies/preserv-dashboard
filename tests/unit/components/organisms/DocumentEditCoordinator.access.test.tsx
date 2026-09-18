// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DocumentEditCoordinator } from '@organisms/DocumentEditCoordinator'

const mockRefresh = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
vi.mock('@molecules/DocumentEditActions', () => ({ DocumentEditActions: () => null }))
vi.mock('@molecules/DocumentEditConfirmationDialog', () => ({ DocumentEditConfirmationDialog: () => null }))
vi.mock('@molecules/DocumentEditAccessDialog', () => ({
  DocumentEditAccessDialog: ({
    open,
    warning,
    onReasonChange,
    onClose,
    onConfirm,
  }: {
    open: boolean
    warning: string
    onReasonChange: (value: string) => void
    onClose: () => void
    onConfirm: () => void
  }) =>
    open ? (
      <div>
        <div>{warning === 'approved' ? 'Approved warning' : 'Published warning'}</div>
        <input
          aria-label={'Reason'}
          value={warning === 'published' ? 'Correct the published title.' : ''}
          readOnly
          onClick={() => onReasonChange('Correct the published title.')}
        />
        <button onClick={onClose}>{'No'}</button>
        <button disabled={warning !== 'published'} onClick={onConfirm}>
          {'Yes'}
        </button>
      </div>
    ) : null,
}))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('DocumentEditCoordinator edit access', () => {
  let root: Root | undefined

  afterEach(() => {
    vi.restoreAllMocks()
    act(() => root?.unmount())
    root = undefined
    document.body.replaceChildren()
    mockRefresh.mockReset()
  })

  it('requires confirmation and a reason before enabling editing for an approved document', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <DocumentEditCoordinator
          documentId={'doc-1'}
          metadata={[]}
          quality={{ validation_status: 'APPROVED' } as never}
          initialTags={[]}
          initialContributors={[]}
          initialPublishers={[]}
          initialAccessLevels={[]}
          editWarning={'approved'}
        >
          <div>Details</div>
        </DocumentEditCoordinator>,
      )
    })

    const switchInput = container.querySelector('input[type="checkbox"]')
    expect(switchInput).not.toBeNull()
    act(() => {
      switchInput?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Approved warning')
    expect(container.querySelector<HTMLButtonElement>('button[disabled]')?.textContent).toBe('Yes')
    expect((switchInput as HTMLInputElement).checked).toBe(false)

    act(() => container.querySelector('button')?.click())
    expect(container.textContent).not.toContain('Approved warning')
    expect((switchInput as HTMLInputElement).checked).toBe(false)
  })

  it('enables editing after the reason is confirmed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ changed: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <DocumentEditCoordinator
          documentId={'doc-1'}
          metadata={[]}
          quality={{ validation_status: 'APPROVED' } as never}
          initialTags={[]}
          initialContributors={[]}
          initialPublishers={[]}
          initialAccessLevels={[]}
          editWarning={'published'}
        >
          <div>Details</div>
        </DocumentEditCoordinator>,
      )
    })

    const switchInput = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    act(() => {
      switchInput.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      container.querySelector<HTMLInputElement>('input[aria-label="Reason"]')?.click()
    })
    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Yes')
        ?.click()
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/documents/doc-1/edit-access',
      expect.objectContaining({ body: JSON.stringify({ reason: 'Correct the published title.' }) }),
    )
    expect(switchInput.checked).toBe(true)
  })
})
