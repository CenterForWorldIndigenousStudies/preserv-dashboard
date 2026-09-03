// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProcessBatch } from '@molecules/processStoryFixtures'
import { ProcessBatchProgress } from '@organisms/ProcessBatchProgress'
import type { BatchProperty } from 'types/batches'
import type { ProcessBatchStatus } from 'types/pipelineContracts'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class FakeEventSource {
  static instances: FakeEventSource[] = []
  readonly listeners = new Map<string, (event: MessageEvent<string>) => void>()
  readonly url: string
  closed = false

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }

  addEventListener(event: string, listener: (message: MessageEvent<string>) => void): void {
    this.listeners.set(event, listener)
  }

  close(): void {
    this.closed = true
  }

  emit(event: string, payload: ProcessBatchStatus): void {
    this.listeners.get(event)?.({ data: JSON.stringify(payload) } as MessageEvent<string>)
  }
}

vi.stubGlobal('EventSource', FakeEventSource)

vi.mock('@molecules/ProcessBatchStatusCard', () => ({
  ProcessBatchStatusCard: ({
    batch,
    executionActions,
  }: {
    batch: ProcessBatchStatus
    executionActions?: ReactElement
  }) => (
    <div data-testid={'batch-progress'}>
      {batch.lifecycleStatus}
      {executionActions}
    </div>
  ),
}))

vi.mock('@organisms/BatchProcessingDetails', () => ({
  BatchProcessingDetails: ({ properties }: { properties: readonly BatchProperty[] }) => (
    <div data-testid={'processing-details'}>
      {properties.map((property) => `${property.key}:${String(property.value)}`)}
    </div>
  ),
}))

vi.mock('@organisms/BatchExecutionActions', () => ({
  BatchExecutionActions: ({ onExecutionQueued }: { onExecutionQueued?: () => void }) => (
    <button type={'button'} data-testid={'rerun-action'} onClick={onExecutionQueued}>
      {'Rerun'}
    </button>
  ),
}))

let mountedRoot: Root | undefined

function renderProgress(batch: ProcessBatchStatus, processingDetails?: readonly BatchProperty[]): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)
  act(() => {
    mountedRoot?.render(<ProcessBatchProgress initialBatch={batch} processingDetails={processingDetails} />)
  })
  return container
}

describe('ProcessBatchProgress', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    FakeEventSource.instances = []
    document.body.replaceChildren()
  })

  it('updates the shared progress surface when the batch stream emits a status', () => {
    const initialBatch = createProcessBatch({ lifecycleStatus: 'running' })
    const container = renderProgress(initialBatch)

    expect(FakeEventSource.instances[0]?.url).toContain(`batchId=${initialBatch.batchId}`)
    expect(container.querySelector('[data-testid="batch-progress"]')?.textContent).toContain('running')

    act(() => {
      FakeEventSource.instances[0]?.emit('batch_status', {
        ...initialBatch,
        lifecycleStatus: 'completed',
      })
    })

    expect(container.querySelector('[data-testid="batch-progress"]')?.textContent).toContain('completed')
    expect(FakeEventSource.instances[0]?.closed).toBe(true)
  })

  it('renders batch processing details inside the batch progress organism', () => {
    const container = renderProgress(createProcessBatch(), [{ key: 'total_documents', value: 5 }])

    expect(container.querySelector('[data-testid="processing-details"]')?.textContent).toContain('total_documents:5')
  })

  it('reconnects after a rerun is queued after the previous stream completed', () => {
    const initialBatch = createProcessBatch({ lifecycleStatus: 'completed' })
    const container = renderProgress(initialBatch)
    const completedStream = FakeEventSource.instances[0]

    act(() => {
      completedStream?.emit('batch_status', initialBatch)
    })

    expect(completedStream?.closed).toBe(true)

    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="rerun-action"]')?.click()
    })

    expect(FakeEventSource.instances).toHaveLength(2)
    expect(FakeEventSource.instances[1]?.closed).toBe(false)
  })
})
