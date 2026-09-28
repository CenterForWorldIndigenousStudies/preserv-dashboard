import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetProcessBatchStatuses } = vi.hoisted(() => ({
  mockGetProcessBatchStatuses: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatuses: mockGetProcessBatchStatuses,
}))

vi.mock('@lib/queries/batchDraftQueries', () => ({
  getBatchDrafts: vi.fn().mockResolvedValue([]),
  getBatchDraft: vi.fn().mockResolvedValue(null),
}))

vi.mock('@organisms/ProcessDocumentsWorkspace', () => ({
  ProcessDocumentsWorkspace: () => <div>Process workspace stub</div>,
}))

vi.mock('@organisms/PageInfoModal', () => ({
  PageInfoModal: ({ children, title }: { children: ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}))

import ProcessDocumentsPage from '@root/app/process-documents/page'

describe('ProcessDocumentsPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('frames Process as launch and points users to Batches for deeper monitoring', async () => {
    mockGetProcessBatchStatuses.mockResolvedValue([])

    const markup = renderToStaticMarkup(await ProcessDocumentsPage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Use this route for launch and orchestration, then move to Batches for deeper monitoring.')
    expect(markup).toContain('Process owns setup, launch, and early confirmation.')
    expect(markup).toContain('Open Batches for Monitoring')
    expect(markup).toContain('/batches')
    expect(markup).toContain('Process workspace stub')
    expect(mockGetProcessBatchStatuses).toHaveBeenCalledWith(3)
  })
})
