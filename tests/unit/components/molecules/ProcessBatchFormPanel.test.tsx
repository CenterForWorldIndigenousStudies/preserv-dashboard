// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecules/SearchEntityBox', () => ({
  SearchEntityBox: (props: {
    inputValue: string
    label: string
    options?: unknown[]
    error?: boolean
    helperText?: string
  }) => (
    <div data-testid={'batch-search-box'} data-option-count={props.options?.length ?? 0} data-value={props.inputValue}>
      <label>
        {props.label}
        <input aria-label={props.label} value={props.inputValue} readOnly />
      </label>
      {props.error && props.helperText ? <span>{props.helperText}</span> : null}
    </div>
  ),
}))

import { ProcessBatchFormPanel } from '@molecules/ProcessBatchFormPanel'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

function renderPanel(overrides: Record<string, unknown> = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(
      <ProcessBatchFormPanel
        batchName={'Existing batch'}
        collectionName={''}
        collectionNotes={''}
        isSubmitting={false}
        isRefreshing={false}
        canSubmit={false}
        submitError={null}
        acceptedBatchName={null}
        batchNameSearchError={null}
        batchNameExists={true}
        onBatchNameChange={vi.fn()}
        onCollectionNameChange={vi.fn()}
        onCollectionNotesChange={vi.fn()}
        onSubmit={vi.fn()}
        onRefresh={vi.fn()}
        {...overrides}
      />,
    )
  })

  return container
}

describe('ProcessBatchFormPanel', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
  })

  it('shows an inline error when the batch name already exists', () => {
    const container = renderPanel()

    expect(container.textContent).toContain('A batch with this name already exists. Choose a different name.')
    expect(container.querySelector('[data-testid="batch-search-box"]')).not.toBeNull()
  })

  it('does not display fuzzy batch suggestions while creating a batch', () => {
    const container = renderPanel()

    expect(container.querySelector('[data-testid="batch-search-box"]')?.getAttribute('data-option-count')).toBe('0')
  })

  it('keeps Ingest enabled for a new batch name when other conditions allow submit', () => {
    const container = renderPanel({
      batchName: 'New batch',
      batchNameExists: false,
      canSubmit: true,
    })

    const ingestButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Ingest',
    )

    expect(ingestButton?.disabled).toBe(false)
  })
})
