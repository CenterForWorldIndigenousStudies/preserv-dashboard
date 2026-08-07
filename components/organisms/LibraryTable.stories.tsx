import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { LibraryTable } from './LibraryTable'
import type { DocumentTableFetchResult, DocumentTableQuery } from './DocumentTable/types'
import type { AdvancedSearchFilters, FilterOptions } from '@lib/search'
import type { LibraryDocumentItem } from 'types/documents'

const filterOptions: FilterOptions = {
  collections: ['Collection One', 'Collection Two'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: ['APPROVED', 'VALIDATED'],
}

const initialQuery: DocumentTableQuery<AdvancedSearchFilters> = {
  page: 1,
  pageSize: 25,
  filters: {},
}

const uploadedDocument: LibraryDocumentItem = {
  id: 'document-1',
  legacyId: 'legacy-document-1',
  sourceId: 'source-document-1',
  name: 'Community history collection',
  fedoraUrl: 'https://fedora.example.org/node/document-1',
  uploadedAt: '2026-07-01T12:00:00.000Z',
  collections: [{ id: 'collection-1', name: 'Collection One' }],
  batch: { id: 'batch-1', name: 'July upload batch', createdAt: '2026-07-01T00:00:00.000Z' },
}

const multiCollectionDocument: LibraryDocumentItem = {
  ...uploadedDocument,
  id: 'document-2',
  name: 'Language revitalization report',
  collections: [
    { id: 'collection-1', name: 'Collection One' },
    { id: 'collection-2', name: 'Collection Two' },
  ],
}

const missingMetadataDocument: LibraryDocumentItem = {
  id: 'document-3',
  legacyId: null,
  sourceId: null,
  name: null,
  fedoraUrl: null,
  uploadedAt: null,
  collections: [],
  batch: null,
}

function initialData(data: LibraryDocumentItem[]): DocumentTableFetchResult<LibraryDocumentItem> {
  return {
    data,
    totalCount: data.length,
    pageInfo: {
      pageSize: 25,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  }
}

const meta: Meta<typeof LibraryTable> = {
  title: 'Organisms/LibraryTable',
  component: LibraryTable,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const UploadedDocuments: Story = {
  args: {
    filterOptions,
    initialQuery,
    initialData: initialData([uploadedDocument, multiCollectionDocument]),
  },
}

export const MultipleCollections: Story = {
  args: {
    filterOptions,
    initialQuery,
    initialData: initialData([multiCollectionDocument]),
  },
}

export const MissingMetadata: Story = {
  args: {
    filterOptions,
    initialQuery,
    initialData: initialData([missingMetadataDocument]),
  },
}

export const Empty: Story = {
  args: {
    filterOptions,
    initialQuery,
    initialData: initialData([]),
  },
}
