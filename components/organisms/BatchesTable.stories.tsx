import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { BatchesTable } from './BatchesTable'
import { BATCH_LIFECYCLE_STATUSES } from '@constants/batchLifecycleStatuses'
import { BATCH_PUBLICATION_STATUSES } from '@constants/batchPublicationStatuses'
import type { FilterOptions } from '@lib/search'
import type { BatchListItem } from 'types/batches'

const rows: BatchListItem[] = [
  {
    id: 'batch-2026-001',
    idLegacy: 'BATCH-2026-001',
    name: 'January preservation run',
    startedAt: '2026-01-15T09:00:00.000Z',
    documentCount: 125,
    totalCost: '$42.75',
    processingTime: 3600,
  },
  {
    id: 'batch/2026/002',
    idLegacy: null,
    name: 'February preservation run',
    startedAt: '2026-02-12T14:30:00.000Z',
    documentCount: 48,
    totalCost: '$18.20',
    processingTime: 'Unknown',
  },
]

const initialQuery = {
  page: 1,
  pageSize: 25,
  filters: {},
} as const

const filterOptions: FilterOptions = {
  collections: ['January collection', 'February collection'],
  accessLevels: ['public', 'restricted'],
  statuses: ['APPROVED', 'PENDING'],
  lifecycleStatuses: Object.values(BATCH_LIFECYCLE_STATUSES),
  publicationStatuses: Object.values(BATCH_PUBLICATION_STATUSES),
}

const meta = {
  title: 'Organisms/BatchesTable',
  component: BatchesTable,
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true, navigation: { pathname: '/batches' } },
    a11y: { disable: true },
  },
} satisfies Meta<typeof BatchesTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    initialQuery,
    filterOptions,
    initialData: {
      data: rows,
      totalCount: rows.length,
      pageInfo: {
        pageSize: 25,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  },
}

export const Empty: Story = {
  args: {
    initialQuery,
    filterOptions,
    initialData: {
      data: [],
      totalCount: 0,
      pageInfo: {
        pageSize: 25,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  },
}
