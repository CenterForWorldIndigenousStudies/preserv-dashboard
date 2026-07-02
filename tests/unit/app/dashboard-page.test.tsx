import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetDashboardKpiMetrics } = vi.hoisted(() => ({
  mockGetDashboardKpiMetrics: vi.fn(),
}))

vi.mock('@lib/dashboardMetrics', () => ({
  getDashboardKpiMetrics: mockGetDashboardKpiMetrics,
}))

import DashboardPage from '@root/app/dashboard/page'

describe('DashboardPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders queue snapshots, collections quick action, and current live KPI links', async () => {
    mockGetDashboardKpiMetrics.mockResolvedValue([
      { title: 'Needs Review', value: 12, href: '/review-queue' },
      { title: 'Ready for Library', value: 4, href: '/ready-for-library' },
      { title: 'Active Batches', value: 1, href: '/batches' },
    ])

    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Needs Review')
    expect(markup).toContain('Ready for Library')
    expect(markup).toContain('Active Batches')
    expect(markup).toContain('12')
    expect(markup).toContain('4')
    expect(markup).toContain('1')
    expect(markup).toContain('/review-queue')
    expect(markup).toContain('/ready-for-library')
    expect(markup).toContain('/batches')
    expect(markup).toContain('Queue Snapshots')
    expect(markup).toContain('Open the live review queue for documents needing human attention.')
    expect(markup).toContain('Open approved documents with dashboard-visible library-ready criteria.')
    expect(markup).toContain(
      'Open the failures workspace. A reliable dashboard failure total is not available yet in the current data model.',
    )
    expect(markup).toContain('Collections')
    expect(markup).not.toContain('Failed Documents')
    expect(markup).not.toContain('while this page remains a skeleton')
  })
})
