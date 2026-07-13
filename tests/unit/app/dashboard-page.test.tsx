import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetDashboardKpiMetrics } = vi.hoisted(() => ({
  mockGetDashboardKpiMetrics: vi.fn(),
}))

vi.mock('@lib/dashboardMetrics', () => ({
  getDashboardKpiMetrics: mockGetDashboardKpiMetrics,
}))

import DashboardPage from '@root/app/dashboard/page'
import { BATCHES_PATH, FAILED_PATH, READY_FOR_LIBRARY_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'

describe('DashboardPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders queue snapshots, collections quick action, and current live KPI links', async () => {
    mockGetDashboardKpiMetrics.mockResolvedValue([
      { title: 'Needs Review', value: 12, href: REVIEW_QUEUE_PATH },
      { title: 'Ready for Library', value: 4, href: READY_FOR_LIBRARY_PATH },
      { title: 'Active Batches', value: 1, href: BATCHES_PATH },
    ])

    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Needs Review')
    expect(markup).toContain('Ready for Library')
    expect(markup).toContain('Active Batches')
    expect(markup).toContain('12')
    expect(markup).toContain('4')
    expect(markup).toContain('1')
    expect(markup).toContain(REVIEW_QUEUE_PATH)
    expect(markup).toContain(READY_FOR_LIBRARY_PATH)
    expect(markup).toContain(BATCHES_PATH)
    expect(markup).toContain('Queue Snapshots')
    expect(markup).toContain('Open the live review queue for documents needing human attention.')
    expect(markup).toContain('Open approved documents with dashboard-visible library-ready criteria.')
    expect(markup).toContain('Collections')
    expect(markup).not.toContain(FAILED_PATH)
    expect(markup).not.toContain('Inspect the current failures view.')
    expect(markup).not.toContain('Failed Documents')
    expect(markup).not.toContain('while this page remains a skeleton')
  })
})
