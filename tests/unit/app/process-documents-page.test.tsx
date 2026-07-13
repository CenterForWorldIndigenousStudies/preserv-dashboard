import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetProcessBatchStatuses } = vi.hoisted(() => ({
  mockGetProcessBatchStatuses: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatuses: mockGetProcessBatchStatuses,
}))

vi.mock('@organisms/ProcessDocumentsWorkspace', () => ({
  ProcessDocumentsWorkspace: () => <div>Process workspace stub</div>,
}))

import ProcessDocumentsPage from '@root/app/process-documents/page'

describe('ProcessDocumentsPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('frames Process as launch and points users to Batches for deeper monitoring', async () => {
    mockGetProcessBatchStatuses.mockResolvedValue([])

    const markup = renderToStaticMarkup(await ProcessDocumentsPage())

    expect(markup).toContain('Use this route for launch and orchestration, then move to Batches for deeper monitoring.')
    expect(markup).toContain('Process owns setup, launch, and early confirmation.')
    expect(markup).toContain('Open Batches for Monitoring')
    expect(markup).toContain('/batches')
    expect(markup).toContain('Process workspace stub')
  })
})
