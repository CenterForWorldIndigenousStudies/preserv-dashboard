import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { COLLECTIONS_PATH } from '@constants/paths'
import { CollectionsPageClient } from '@organisms/CollectionsPageClient'
import type { FilterOptions } from '@lib/search'
import type { CollectionWithMeta } from 'types/collections'

const sampleCollections: CollectionWithMeta[] = [
  {
    id: '00000001-0001-0001-0001-000000000001',
    tag_id: 'tag-001',
    collection_name: 'Nicaragua Conflict Documentation',
    notes: 'Documents related to the Miskito-Sumo-Rama conflict and peace negotiations.',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    document_count: 2,
  },
  {
    id: '00000002-0002-0002-0002-000000000002',
    tag_id: 'tag-002',
    collection_name: 'First Nations Canada',
    notes: null,
    created_at: '2026-02-20T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    document_count: 0,
  },
]

const filterOptions: FilterOptions = {
  collections: sampleCollections.map(({ collection_name }) => collection_name),
  accessLevels: ['open access', 'restricted', 'internal', 'confidential'],
  statuses: ['APPROVED', 'NEEDS_REVIEW', 'VALIDATED'],
}

const meta = {
  title: 'Organisms/CollectionsPageClient',
  component: CollectionsPageClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: COLLECTIONS_PATH,
      },
    },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 'min(72rem, 100%)', p: 2 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof CollectionsPageClient>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    collections: sampleCollections,
    filterOptions,
  },
}

export const Empty: Story = {
  args: {
    collections: [],
    filterOptions,
  },
}
