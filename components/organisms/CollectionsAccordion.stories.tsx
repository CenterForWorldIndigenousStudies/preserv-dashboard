import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'

import { COLLECTIONS_PATH } from '@constants/paths'
import type { FilterOptions } from '@lib/search'
import type { CollectionWithMeta } from 'types/collections'
import type { Document } from 'types/documents'
import { CollectionsAccordion } from './CollectionsAccordion'

const UUIDS = {
  coll1: '00000001-0001-0001-0001-000000000001',
  coll2: '00000002-0002-0002-0002-000000000002',
  coll3: '00000003-0003-0003-0003-000000000003',
  doc1: '00000011-0011-0011-0011-000000000011',
  doc2: '00000012-0012-0012-0012-000000000012',
} as const

const sampleDocuments: Document[] = [
  {
    id: UUIDS.doc1,
    name: 'Miskito-Sumo-Rama Conflict Analysis',
    id_legacy: 'CWIS-2026-001',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-15T14:30:00Z',
    filesize: 1048576,
    source_id: null,
    hash_binary: null,
    hash_content: null,
    is_duplicate: false,
  },
  {
    id: UUIDS.doc2,
    name: 'Nicaragua Peace Negotiations Document',
    id_legacy: 'CWIS-2026-002',
    created_at: '2026-03-28T10:00:00Z',
    updated_at: '2026-04-10T16:00:00Z',
    filesize: 524288,
    source_id: null,
    hash_binary: null,
    hash_content: null,
    is_duplicate: false,
  },
]

const sampleCollections: CollectionWithDocuments[] = [
  {
    id: UUIDS.coll1,
    tag_id: 'tag-001',
    collection_name: 'Nicaragua Conflict Documentation',
    notes: 'Documents related to the Miskito-Sumo-Rama conflict and peace negotiations.',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    document_count: 2,
    documents: sampleDocuments,
  },
  {
    id: UUIDS.coll2,
    tag_id: 'tag-002',
    collection_name: 'First Nations Canada',
    notes: null,
    created_at: '2026-02-20T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    document_count: 0,
    documents: [],
  },
  {
    id: UUIDS.coll3,
    tag_id: 'tag-003',
    collection_name: 'Indigenous Health Conference',
    notes: 'Proceedings and background materials from the World Indigenous Health Conference.',
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-04-20T00:00:00Z',
    document_count: 1,
    documents: [
      {
        id: '00000013-0013-0013-0013-000000000013',
        name: 'Healing our Spirits Worldwide',
        id_legacy: 'CWIS-2026-003',
        created_at: '2026-03-10T00:00:00Z',
        updated_at: '2026-04-20T00:00:00Z',
        filesize: 2097152,
        source_id: null,
        hash_binary: null,
        hash_content: null,
        is_duplicate: false,
      },
    ],
  },
]

const filterOptions: FilterOptions = {
  collections: sampleCollections.map(({ collection_name }) => collection_name),
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: ['APPROVED', 'NEEDS_REVIEW', 'VALIDATED'],
}

interface CollectionWithDocuments extends CollectionWithMeta {
  documents: Document[]
}

const meta = {
  component: CollectionsAccordion,
  tags: ['autodocs'],
  args: {
    collections: sampleCollections,
    filterOptions,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: COLLECTIONS_PATH,
      },
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 'min(72rem, 100%)', p: 2 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof CollectionsAccordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Empty: Story = {
  args: {
    collections: [],
    filterOptions,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('No collections found.')).toBeVisible()
  },
}

export const SingleCollection: Story = {
  args: {
    collections: [sampleCollections[0]],
    filterOptions,
  },
}

export const MixedDocumentCounts: Story = {
  args: {
    collections: sampleCollections,
    filterOptions,
  },
}

export const DeletableCollections: Story = {
  args: {
    collections: sampleCollections,
    filterOptions,
  },
}
