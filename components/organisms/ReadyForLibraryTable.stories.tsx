import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { READY_FOR_LIBRARY_PATH } from '@constants/paths'
import type { DocumentTableFetchResult, DocumentTableQuery } from '@organisms/DocumentTable/types'
import type { AdvancedSearchFilters, FilterOptions } from '@lib/search'
import type { ReadyForLibraryItem } from 'types/documents'

import { ReadyForLibraryTable } from './ReadyForLibraryTable'

const UUIDS = {
  doc1: '00000001-0001-0001-0001-000000000001',
  doc2: '00000002-0002-0002-0002-000000000002',
  doc3: '00000003-0003-0003-0003-000000000003',
  doc4: '00000004-0004-0004-0004-000000000004',
} as const

const sampleItems: ReadyForLibraryItem[] = [
  {
    id: UUIDS.doc1,
    name: 'Miskito-Sumo-Rama Conflict Analysis',
    validation_status: 'APPROVED',
    validation_timestamp: '2026-04-28T10:00:00Z',
    metadata_complete: true,
    access_level: 'public',
  },
  {
    id: UUIDS.doc2,
    name: 'Nicaragua: A History of Indigenous Resistance',
    validation_status: 'APPROVED',
    validation_timestamp: '2026-04-27T15:30:00Z',
    metadata_complete: true,
    access_level: 'restricted',
  },
  {
    id: UUIDS.doc3,
    name: null,
    validation_status: 'APPROVED',
    validation_timestamp: '2026-04-26T09:15:00Z',
    metadata_complete: false,
    access_level: null,
  },
  {
    id: UUIDS.doc4,
    name: 'First Nations in Canada: Regional Overview',
    validation_status: 'APPROVED',
    validation_timestamp: '2026-04-25T14:00:00Z',
    metadata_complete: true,
    access_level: 'public',
  },
]

const initialQuery: DocumentTableQuery<AdvancedSearchFilters> = {
  page: 1,
  pageSize: 25,
  filters: {},
}

const filterOptions: FilterOptions = {
  collections: ['Collection A', 'Collection B'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: ['APPROVED', 'VALIDATED'],
}

function createInitialData(items: ReadyForLibraryItem[]): DocumentTableFetchResult<ReadyForLibraryItem> {
  return {
    data: items,
    totalCount: items.length,
    pageInfo: {
      pageSize: 25,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  }
}

const meta = {
  component: ReadyForLibraryTable,
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: READY_FOR_LIBRARY_PATH,
      },
    },
  },
} satisfies Meta<typeof ReadyForLibraryTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    initialData: createInitialData(sampleItems),
    initialQuery,
    filterOptions,
  },
}

export const Empty: Story = {
  args: {
    initialData: createInitialData([]),
    initialQuery,
    filterOptions,
  },
}

export const SomeIncomplete: Story = {
  args: {
    initialData: createInitialData([
      ...sampleItems,
      {
        id: '00000005-0005-0005-0005-000000000005',
        name: 'Incomplete Metadata Document',
        validation_status: 'APPROVED',
        validation_timestamp: '2026-04-24T11:00:00Z',
        metadata_complete: false,
        access_level: null,
      },
    ]),
    initialQuery,
    filterOptions,
  },
}
