import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ACCESS_LEVEL_OPTIONS } from '@constants/accessLevels'
import { COLLECTIONS_PATH } from '@constants/paths'
import type { FilterOptions } from '@lib/search'
import type { CollectionWithMeta } from 'types/collections'
import { CollectionDetails } from './CollectionDetails'

const sampleCollection: CollectionWithMeta = {
  id: '00000001-0001-0001-0001-000000000001',
  tag_id: 'tag-001',
  collection_name: 'Nicaragua Conflict Documentation',
  notes: 'Documents related to the Miskito-Sumo-Rama conflict and peace negotiations.',
  fedora_node_id: '12345',
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  document_count: 2,
}

const filterOptions: FilterOptions = {
  collections: [sampleCollection.collection_name],
  accessLevels: [...ACCESS_LEVEL_OPTIONS],
  statuses: ['APPROVED', 'NEEDS_REVIEW', 'VALIDATED'],
}

const meta = {
  component: CollectionDetails,
  tags: ['autodocs'],
  args: {
    collection: sampleCollection,
    filterOptions,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: `${COLLECTIONS_PATH}/${sampleCollection.id}`,
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
} satisfies Meta<typeof CollectionDetails>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const UnmappedCollection: Story = {
  args: {
    collection: {
      ...sampleCollection,
      fedora_node_id: null,
    },
  },
}

export const EmptyCollection: Story = {
  args: {
    collection: {
      ...sampleCollection,
      document_count: 0,
    },
  },
}
